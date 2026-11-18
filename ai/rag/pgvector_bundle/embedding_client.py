import json
import os
import random
import time
import urllib.error
import urllib.parse
import urllib.request

PROVIDER_DEFAULTS = {
    "openai": {
        "model": "text-embedding-3-small",
        "dim": 1536,
        "base_url": "https://api.openai.com/v1",
        "key_env": "OPENAI_API_KEY",
    },
    "groq": {
        "model": "nomic-embed-text-v1_5",
        "dim": 768,
        "base_url": "https://api.groq.com/openai/v1",
        "key_env": "GROQ_API_KEY",
    },
    "gemini": {
        "model": "gemini-embedding-001",
        "dim": 1536,
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "key_env": "GEMINI_API_KEY",
    },
    "nvidia": {
        "model": "nvidia/llama-3.2-nemoretriever-300m-embed-v1",
        "dim": 2048,
        "base_url": "https://integrate.api.nvidia.com/v1",
        "key_env": "NVIDIA_API_KEY",
    },
    "openrouter": {
        "model": "nvidia/nemotron-3.5-embed-1b:free",
        "dim": 2048,
        "base_url": "https://openrouter.ai/api/v1",
        "key_env": "OPENROUTER_API_KEY",
    },
}

OPENAI_MODEL_DIMS = {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "text-embedding-ada-002": 1536,
}


def _env(name, default=None):
    value = os.environ.get(name)
    if value is None or not value.strip():
        return default
    return value.strip()


class EmbeddingConfig:
    def __init__(self):
        self.provider = _env("EMBED_PROVIDER", "openai").lower()
        if self.provider == "openai-compatible":
            self.provider = "openai"
        if self.provider not in PROVIDER_DEFAULTS:
            raise ValueError(
                f"EMBED_PROVIDER không hợp lệ: {self.provider}. "
                f"Chọn: {', '.join(PROVIDER_DEFAULTS)}"
            )
        defaults = PROVIDER_DEFAULTS[self.provider]
        self.model = _env("EMBED_MODEL", defaults["model"])
        default_dim = defaults["dim"]
        if self.provider == "openai":
            default_dim = OPENAI_MODEL_DIMS.get(self.model, default_dim)
        raw_dim = _env("EMBED_DIM")
        self.dim = int(raw_dim) if raw_dim else default_dim
        self.base_url = _env("EMBED_BASE_URL", defaults["base_url"]).rstrip("/")
        self.key_env = defaults["key_env"]
        self.api_key = (_env("EMBED_API_KEY") or _env(self.key_env) or "").strip()
        self.batch_size = int(_env("EMBED_BATCH_SIZE", "100"))
        self.timeout = int(_env("EMBED_TIMEOUT", "120"))
        self.max_retries = int(_env("EMBED_MAX_RETRIES", "6"))

    def require_key(self):
        if not self.api_key:
            raise RuntimeError(
                f"Thiếu API key. Đặt EMBED_API_KEY hoặc {self.key_env}."
            )
        return self

    def summary(self):
        return {
            "provider": self.provider,
            "model": self.model,
            "dim": self.dim,
            "base_url": self.base_url,
        }


def _retry_delay(retry_after, attempt):
    if retry_after:
        try:
            return min(60.0, float(retry_after))
        except ValueError:
            pass
    return min(60.0, 2 ** attempt) + random.random()


def _post_json(url, headers, payload, config):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    last_error = None
    for attempt in range(config.max_retries):
        request = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=config.timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", "replace")[:1500]
            if error.code == 429 or error.code >= 500:
                retry_after = error.headers.get("Retry-After")
                last_error = RuntimeError(f"HTTP {error.code}: {detail}")
                time.sleep(_retry_delay(retry_after, attempt))
                continue
            raise RuntimeError(f"HTTP {error.code}: {detail}")
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last_error = error
            time.sleep(min(60.0, 2 ** attempt) + random.random())
    raise RuntimeError(
        f"Gọi API thất bại sau {config.max_retries} lần: {last_error}"
    )


def _openai_embeddings(texts, task, config):
    if config.provider == "groq" and config.dim != 768:
        raise RuntimeError("Groq nomic-embed-text chỉ hỗ trợ 768 chiều.")
    if "nomic-embed-text" in config.model.lower():
        prefix = "search_document: " if task == "document" else "search_query: "
        texts = [prefix + text for text in texts]
    payload = {"model": config.model, "input": texts}
    if config.provider == "nvidia":
        payload["input_type"] = "passage" if task == "document" else "query"
        payload["truncate"] = "END"
    if (
        config.provider == "openai"
        and config.model.startswith("text-embedding-3")
        and config.dim != OPENAI_MODEL_DIMS.get(config.model, config.dim)
    ):
        payload["dimensions"] = config.dim
    data = _post_json(
        config.base_url + "/embeddings",
        {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
        },
        payload,
        config,
    )
    items = data.get("data")
    if not items:
        raise RuntimeError(f"Phản hồi embeddings rỗng: {json.dumps(data)[:500]}")
    items = sorted(items, key=lambda item: item.get("index", 0))
    return [item["embedding"] for item in items]


def _gemini_embeddings(texts, task, config):
    task_type = "RETRIEVAL_DOCUMENT" if task == "document" else "RETRIEVAL_QUERY"
    supports_dim = config.model.startswith("gemini-embedding")
    if not supports_dim and config.dim != 768:
        raise RuntimeError(
            f"{config.model} chỉ hỗ trợ 768 chiều; đặt EMBED_DIM=768."
        )
    requests = []
    for text in texts:
        item = {
            "model": f"models/{config.model}",
            "content": {"parts": [{"text": text}]},
            "taskType": task_type,
        }
        if supports_dim:
            item["outputDimensionality"] = config.dim
        requests.append(item)
    payload = {"requests": requests}
    url = (
        f"{config.base_url}/models/{config.model}:batchEmbedContents"
        f"?key={urllib.parse.quote(config.api_key)}"
    )
    data = _post_json(url, {"Content-Type": "application/json"}, payload, config)
    items = data.get("embeddings") or []
    vectors = []
    for item in items:
        if "values" in item:
            vectors.append(item["values"])
        elif "embedding" in item:
            vectors.append(item["embedding"]["values"])
        else:
            raise RuntimeError(
                f"Phản hồi Gemini không hợp lệ: {json.dumps(item)[:300]}"
            )
    return vectors


def embed_texts(texts, task="document", config=None):
    config = (config or EmbeddingConfig()).require_key()
    if not texts:
        return []
    if config.provider == "gemini":
        vectors = _gemini_embeddings(texts, task, config)
    else:
        vectors = _openai_embeddings(texts, task, config)
    if len(vectors) != len(texts):
        raise RuntimeError(
            f"Số vector ({len(vectors)}) khác số văn bản ({len(texts)})."
        )
    for vector in vectors:
        if len(vector) != config.dim:
            raise RuntimeError(
                f"Vector có {len(vector)} chiều nhưng EMBED_DIM={config.dim}. "
                "Đặt EMBED_DIM đúng hoặc dùng --recreate."
            )
    return vectors


def vector_literal(vector):
    return "[" + ",".join(repr(float(value)) for value in vector) + "]"
