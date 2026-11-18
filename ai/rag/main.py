import json
import logging
import os
import random
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Optional

import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgvector_bundle.embedding_client import (  # noqa: E402
    EmbeddingConfig,
    embed_texts,
    vector_literal,
)

DATABASE_URL = os.environ.get("DATABASE_URL", "")
TABLE = os.environ.get("PGVECTOR_TABLE", "pet_chunks")
GROQ_BASE_URL = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
DEFAULT_TOP_K = int(os.environ.get("RAG_TOP_K", "5"))
MAX_CHUNK_CHARS = int(os.environ.get("RAG_MAX_CHUNK_CHARS", "1800"))
MAX_CONTEXT_CHARS = int(os.environ.get("RAG_MAX_CONTEXT_CHARS", "7000"))
RETRANSLATE_THRESHOLD = float(os.environ.get("RAG_RETRANSLATE_THRESHOLD", "0.33"))

logger = logging.getLogger("petcare.rag")
VIETNAMESE_RE = re.compile(
    r"[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]",
    re.IGNORECASE,
)
UNHELPFUL_RE = re.compile(r"(không|chưa)\s+(có|có đủ)\s+thông tin", re.IGNORECASE)

SYSTEM_PROMPT = """Bạn là trợ lý thú y của phòng khám PetCare, trả lời bằng tiếng Việt.

Quy tắc bắt buộc:
- Chỉ sử dụng thông tin trong phần NGỮ CẢNH được cung cấp. Không bịa thêm.
- Ngữ cảnh có thể bằng tiếng Anh; hãy dịch và tổng hợp lại bằng tiếng Việt.
- Nếu ngữ cảnh có hướng dẫn sơ cứu/chăm sóc liên quan đến triệu chứng (kể cả khi không trùng đúng tên triệu chứng), hãy tổng hợp thành các bước cụ thể cho người dùng.
- Chỉ dùng các hướng dẫn của tình trạng liên quan trực tiếp đến triệu chứng được hỏi; bỏ qua hướng dẫn của bệnh khác xuất hiện trong cùng tài liệu.
- Chỉ nói "không có thông tin" khi thực sự không có bất kỳ hướng dẫn liên quan nào trong NGỮ CẢNH.
- Không chẩn đoán chắc chắn, không kê đơn thuốc. Chỉ hướng dẫn chăm sóc và khuyến nghị khám khi cần.
- Với dấu hiệu nguy hiểm (khó thở, co giật, nôn ra máu, ngộ độc, bỏ ăn kéo dài, mất nước), khuyên đi khám ngay.
- Trả lời ngắn gọn, dễ hiểu, dùng gạch đầu dòng khi phù hợp.
- Không chèn số trích dẫn hoặc mục "Nguồn/Tham khảo" vào câu trả lời; hệ thống tự hiển thị nguồn riêng.
- Không liệt kê nguyên nhân cụ thể ngoài NGỮ CẢNH; chỉ nêu khả năng chung và khuyến nghị phù hợp.
"""

ROLE_PROMPTS = {
    "guest": (
        "VAI TRÒ: KHÁCH (chưa đăng nhập).\n"
        "- Chỉ tư vấn chẩn đoán, triệu chứng, sơ cứu, dinh dưỡng và chăm sóc.\n"
        "- Tuyệt đối không đặt lịch, không tạo phiếu đặt lịch, không hứa hẹn giữ chỗ.\n"
        "- Nếu người dùng muốn đặt lịch, hãy nói họ cần đăng nhập để đặt lịch."
    ),
    "customer_without_pet": (
        "VAI TRÒ: KHÁCH HÀNG đã đăng nhập nhưng CHƯA có hồ sơ thú cưng.\n"
        "- Chỉ tư vấn chẩn đoán và chăm sóc.\n"
        "- Nếu muốn đặt lịch, hãy hướng dẫn thêm hồ sơ thú cưng trước."
    ),
    "customer": (
        "VAI TRÒ: KHÁCH HÀNG đã đăng nhập và CÓ hồ sơ thú cưng.\n"
        "- Có thể tư vấn chẩn đoán và hỗ trợ đặt lịch.\n"
        "- Khi người dùng muốn đặt lịch, KHÔNG nói là đã đặt xong. Chỉ nói hệ thống đã tạo phiếu đặt lịch "
        "và yêu cầu người dùng kiểm tra, xác nhận phiếu trước khi hoàn tất."
    ),
}


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    species: Optional[str] = None
    category: Optional[str] = None
    topK: Optional[int] = Field(default=None, ge=1, le=12)
    role: Optional[str] = None
    pets: Optional[list[dict]] = None


app = FastAPI(title="PetCare AI RAG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _post_json(url, headers, payload, timeout=90, retries=3):
    headers = dict(headers)
    headers.setdefault("User-Agent", "PetCare-RAG/1.0")
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    last_error = None
    for attempt in range(retries):
        request = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:1500]
            last_error = RuntimeError(f"HTTP {error.code}: {detail}")
            if error.code == 429 or error.code >= 500:
                retry_after = error.headers.get("Retry-After")
                delay = min(60.0, float(retry_after)) if retry_after else min(60.0, 2**attempt)
                time.sleep(delay + random.random())
                continue
            raise last_error
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last_error = error
            time.sleep(min(60.0, 2**attempt) + random.random())
    raise RuntimeError(f"Gọi API thất bại sau {retries} lần: {last_error}")


def _detect_species(question, explicit):
    if explicit in ("dog", "cat", "both", "general"):
        return explicit
    text = question.lower()
    dog = any(word in text for word in ("chó", "cún", "puppy", "dog", "canine"))
    cat = any(word in text for word in ("mèo", "kitten", "cat", "feline"))
    if dog and not cat:
        return "dog"
    if cat and not dog:
        return "cat"
    return None


def _species_values(species):
    if species in ("dog", "cat"):
        return [species, "both"]
    if species:
        return [species]
    return None


def _translate_for_search(question):
    """Dịch câu hỏi tiếng Việt sang tiếng Anh để tăng khả năng tìm tài liệu song ngữ."""
    if not GROQ_API_KEY or not VIETNAMESE_RE.search(question):
        return None

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "Translate the Vietnamese veterinary question into a short English "
                "search query. Keep the species and key symptoms. Output only the query.",
            },
            {"role": "user", "content": question},
        ],
        "temperature": 0.0,
        "max_completion_tokens": 80,
    }
    if "gpt-oss" in GROQ_MODEL.lower():
        payload["reasoning_effort"] = "low"

    try:
        data = _post_json(
            GROQ_BASE_URL + "/chat/completions",
            {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            payload,
            timeout=30,
            retries=2,
        )
        choices = data.get("choices") or []
        if not choices:
            return None
        text = ((choices[0].get("message") or {}).get("content") or "").strip()
        text = text.strip("\"'` \n")
        if not text or not re.search(r"[A-Za-z]", text):
            return None
        return text
    except Exception as error:  # noqa: BLE001
        logger.warning("Không dịch được truy vấn sang tiếng Anh: %s", error)
        return None


def _run_search(conn, query_vector, params, top_k):
    conditions = []
    if params:
        if params.get("species_values"):
            conditions.append("species = ANY(%s)")
        if params.get("category"):
            conditions.append("category = %s")
    where_sql = "WHERE " + " AND ".join(conditions) if conditions else ""

    sql = f"""
        SELECT chunk_id, content, category, source_file, species,
               header_1, header_2, header_3,
               1 - (embedding <=> %s::vector) AS score
        FROM {TABLE}
        {where_sql}
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """
    values = []
    if params:
        if params.get("species_values"):
            values.append(params["species_values"])
        if params.get("category"):
            values.append(params["category"])
    query_params = [query_vector] + values + [query_vector, top_k]

    with conn.cursor() as cursor:
        cursor.execute(sql, query_params)
        columns = [description.name for description in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _merge_rows(primary, secondary, top_k):
    merged = {}
    for row in primary + secondary:
        chunk_id = row.get("chunk_id")
        current = merged.get(chunk_id)
        if current is None or float(row.get("score") or 0.0) > float(current.get("score") or 0.0):
            merged[chunk_id] = row
    return sorted(
        merged.values(),
        key=lambda row: float(row.get("score") or 0.0),
        reverse=True,
    )[:top_k]


def _search(question, species, category, top_k):
    if not DATABASE_URL:
        raise RuntimeError("Thiếu DATABASE_URL.")

    config = EmbeddingConfig().require_key()
    values = _species_values(species)
    filter_params = {"species_values": values, "category": category}

    rows = []
    search_query = question
    with psycopg.connect(DATABASE_URL, connect_timeout=15) as conn:
        query_vector = vector_literal(
            embed_texts([question], task="query", config=config)[0]
        )
        rows = _run_search(conn, query_vector, filter_params, top_k)

        best_score = max((float(row.get("score") or 0.0) for row in rows), default=0.0)
        if rows and best_score < RETRANSLATE_THRESHOLD:
            translated = _translate_for_search(question)
            if translated and translated.lower() != question.lower():
                try:
                    english_vector = vector_literal(
                        embed_texts([translated], task="query", config=config)[0]
                    )
                    english_rows = _run_search(conn, english_vector, filter_params, top_k)
                    rows = _merge_rows(rows, english_rows, top_k)
                    search_query = translated
                    logger.info(
                        "Bổ sung truy vấn tiếng Anh %r (score %.3f -> %.3f)",
                        translated,
                        best_score,
                        float(rows[0].get("score") or 0.0) if rows else 0.0,
                    )
                except Exception as error:  # noqa: BLE001
                    logger.warning("Tìm kiếm bổ sung tiếng Anh thất bại: %s", error)

    return rows, config, search_query


def _build_context(rows):
    blocks = []
    total = 0
    for index, row in enumerate(rows, start=1):
        heading = row.get("header_3") or row.get("header_2") or row.get("header_1") or ""
        content = " ".join((row.get("content") or "").split())[:MAX_CHUNK_CHARS]
        block = (
            f"[{index}] Nguồn: {row.get('source_file') or 'N/A'} | "
            f"Danh mục: {row.get('category') or 'N/A'} | "
            f"Loài: {row.get('species') or 'N/A'}\n"
            f"Tiêu đề: {heading}\n{content}"
        )
        if total + len(block) > MAX_CONTEXT_CHARS:
            break
        blocks.append(block)
        total += len(block)
    return "\n\n".join(blocks)


def _looks_unhelpful(answer):
    text = (answer or "").strip()
    return len(text) < 80 and bool(UNHELPFUL_RE.search(text))


def _ask_groq(question, context, role=None, pets=None, search_query=None, retry=False):
    if not GROQ_API_KEY:
        raise RuntimeError("Thiếu GROQ_API_KEY.")
    system_prompt = SYSTEM_PROMPT
    if role in ROLE_PROMPTS:
        system_prompt += "\n" + ROLE_PROMPTS[role]
    if pets:
        pet_lines = ", ".join(
            f"{pet.get('name', 'N/A')} ({pet.get('species', 'N/A')})" for pet in pets
        )
        system_prompt += f"\nTHÚ CƯNG CỦA NGƯỜI DÙNG: {pet_lines}"
    if retry:
        system_prompt += (
            "\nHỆ THỐNG ĐÃ XÁC NHẬN: NGỮ CẢNH có hướng dẫn liên quan. "
            "Không được trả lời 'không có thông tin'; hãy tổng hợp các bước liên quan."
        )
    user_content = f"NGỮ CẢNH:\n{context}\n\nCÂU HỎI: {question}"
    if search_query and search_query.lower() != question.lower():
        user_content += f"\nTRUY VẤN TÌM KIẾM (tiếng Anh): {search_query}"
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.0,
        "max_completion_tokens": 900,
    }
    if "gpt-oss" in GROQ_MODEL.lower():
        payload["reasoning_effort"] = "low"
    data = _post_json(
        GROQ_BASE_URL + "/chat/completions",
        {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        payload,
        timeout=90,
    )
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError(f"Groq trả về rỗng: {json.dumps(data)[:500]}")
    message = choices[0].get("message") or {}
    answer = (message.get("content") or "").strip()
    if not answer:
        raise RuntimeError("Groq không trả về nội dung trả lời.")
    return answer, data.get("model") or GROQ_MODEL


@app.get("/")
def root():
    return {"service": "PetCare AI RAG", "status": "running"}


@app.get("/health")
def health():
    info = {
        "status": "ok",
        "database": "unknown",
        "docs": None,
        "embedding": EmbeddingConfig().summary(),
        "llm": {"provider": "groq", "model": GROQ_MODEL},
    }
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn:
            with conn.cursor() as cursor:
                cursor.execute(f"SELECT count(*) FROM {TABLE}")
                info["docs"] = cursor.fetchone()[0]
                cursor.execute(
                    "SELECT key, value FROM " + TABLE + "_meta "
                    "WHERE key IN ('embedding_model', 'embedding_dim', 'embedding_provider')"
                )
                info["meta"] = dict(cursor.fetchall())
        info["database"] = "ok"
    except Exception as error:  # noqa: BLE001
        info["status"] = "degraded"
        info["database"] = str(error)[:300]
    return info


@app.post("/query", response_class=JSONResponse)
def query_rag(payload: QueryRequest):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Câu hỏi không được để trống.")

    started = time.time()
    species = _detect_species(question, payload.species)
    top_k = payload.topK or DEFAULT_TOP_K

    try:
        rows, config, search_query = _search(question, species, payload.category, top_k)
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Lỗi truy xuất tri thức: {error}")

    if not rows:
        context = (
            "Chưa có tài liệu phòng khám cụ thể trong cơ sở tri thức cho câu hỏi này. "
            "Hãy đóng vai trò trợ lý AI thú y PetCare, tư vấn ngắn gọn, khoa học "
            "dựa trên kiến thức y tế thú y chuẩn mực và hướng dẫn chủ nuôi cách chăm sóc sơ cứu, "
            "nhắc nhở mang thú cưng đi khám nếu có dấu hiệu nguy hiểm."
        )
        try:
            answer, model_used = _ask_groq(
                question,
                context,
                role=payload.role,
                pets=payload.pets,
                search_query=search_query,
            )
            return {
                "answer": answer,
                "sources": [],
                "confidence": 0.0,
                "provider": "groq",
                "model": model_used,
                "embeddingModel": config.model,
                "latencyMs": int((time.time() - started) * 1000),
            }
        except Exception as error:  # noqa: BLE001
            logger.warning("Gọi Groq fallback thất bại: %s", error)
            return {
                "answer": "Mình chưa tìm thấy tài liệu phù hợp trong cơ sở tri thức. "
                "Bạn nên đưa thú cưng đến bác sĩ thú y để được kiểm tra trực tiếp.",
                "sources": [],
                "confidence": 0.0,
                "provider": "groq",
                "model": GROQ_MODEL,
                "embeddingModel": config.model,
                "latencyMs": int((time.time() - started) * 1000),
            }

    context = _build_context(rows)
    confidence = max(float(row.get("score") or 0.0) for row in rows)
    try:
        answer, model_used = _ask_groq(
            question,
            context,
            role=payload.role,
            pets=payload.pets,
            search_query=search_query,
        )
        if _looks_unhelpful(answer) and confidence >= RETRANSLATE_THRESHOLD:
            answer, model_used = _ask_groq(
                question,
                context,
                role=payload.role,
                pets=payload.pets,
                search_query=search_query,
                retry=True,
            )
    except Exception as error:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Lỗi gọi LLM: {error}")

    sources = []
    for index, row in enumerate(rows, start=1):
        if index > len(rows):
            break
        sources.append(
            {
                "index": index,
                "chunkId": row.get("chunk_id"),
                "score": round(float(row.get("score") or 0.0), 4),
                "sourceFile": row.get("source_file"),
                "category": row.get("category"),
                "species": row.get("species"),
                "header": row.get("header_3") or row.get("header_2") or row.get("header_1"),
            }
        )

    return {
        "answer": answer,
        "sources": sources,
        "confidence": round(confidence, 4),
        "provider": "groq",
        "model": model_used,
        "embeddingModel": config.model,
        "latencyMs": int((time.time() - started) * 1000),
    }
