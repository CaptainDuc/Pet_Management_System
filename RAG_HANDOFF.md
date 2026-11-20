# RAG Handoff — Pet Knowledge Base (PostgreSQL + pgvector + Gemini)

> Đọc toàn bộ file này rồi thực hiện đúng thứ tự.
> Không tự bịa dữ liệu, không đổi format chunk, không đổi metadata.

## 0. Nơi làm việc

- Root project **đã có sẵn một folder RAG**. Xác định folder đó (folder đang chứa code/config RAG hiện tại) và làm toàn bộ việc trong đó.
- **Không tạo folder RAG mới ở root.**
- Trong tài liệu này, `<RAG_FOLDER>` là folder RAG có sẵn đó.
- Nếu có nhiều folder khả nghi hoặc không xác định được, dừng lại và hỏi user trước khi ghi file.

## 1. Nguồn artifact

Toàn bộ file đã build nằm tại: `/home/void/Tai_lieu_thu_y`

### Bắt buộc

| File / thư mục | Vai trò |
| --- | --- |
| `processed_pet_chunks.json` | 3296 chunks đã parse + metadata, artifact chính |
| `pgvector_bundle/embedding_client.py` | Gọi API embedding Gemini, retry 429/5xx |
| `pgvector_bundle/embed_pgvector.py` | Embed chunks và upsert vào PostgreSQL/pgvector |
| `pgvector_bundle/search_pgvector.py` | Tìm kiếm ngữ nghĩa, lọc species/category |
| `pgvector_bundle/check_embedding.py` | Smoke test API embedding trước khi ingest |
| `pgvector_bundle/requirements.txt` | Dependency Python |
| `pgvector_bundle/.env.example` | Mẫu cấu hình, không chứa secret |

### Nên có

| File / thư mục | Vai trò |
| --- | --- |
| `Pet_RAG_Knowledge_Base/manifest.jsonl` | Provenance: URL, hash, category, species, OCR |
| `pgvector_bundle/pgvector_schema.sql` | Schema tham khảo; script Python tự tạo bảng |

### Tuỳ chọn (chỉ khi cần rebuild / kiểm tra nguồn)

| File / thư mục | Vai trò |
| --- | --- |
| `processed_markdown/` | 23 file Markdown để kiểm tra thủ công |
| `Pet_RAG_Knowledge_Base/` | PDF gốc theo 3 nhóm |
| `ingest_pipeline.py` | Parse PDF → Markdown → chunks |
| `pet_pdf_collector.py` | Thu thập PDF, dedupe, detect scan/OCR |

### KHÔNG copy

- `venv/`
- `.fastembed_cache/`
- `qdrant_data/`
- `tessdata/`
- `__pycache__/`
- `.env` (chứa API key thật)
- `embed_and_index.py`, `search_rag.py` (bản Qdrant cũ, không dùng cho pgvector)

## 2. Copy artifact vào RAG folder

`<RAG_FOLDER>` phải là **đường dẫn tuyệt đối**, ví dụ `/home/void/my-project/rag`.

Chạy ở nơi truy cập được đường dẫn nguồn:

```bash
cd /home/void/Tai_lieu_thu_y

rsync -av --exclude '.env' --exclude '__pycache__' pgvector_bundle <RAG_FOLDER>/
rsync -av processed_pet_chunks.json <RAG_FOLDER>/

mkdir -p <RAG_FOLDER>/provenance
rsync -av Pet_RAG_Knowledge_Base/manifest.jsonl <RAG_FOLDER>/provenance/
```

Nếu cần nguồn đầy đủ:

```bash
rsync -av processed_markdown <RAG_FOLDER>/
rsync -av ingest_pipeline.py pet_pdf_collector.py <RAG_FOLDER>/
rsync -av Pet_RAG_Knowledge_Base <RAG_FOLDER>/
```

Nếu **không truy cập được** `/home/void/Tai_lieu_thu_y`: dừng lại, yêu cầu user cung cấp `processed_pet_chunks.json` và `pgvector_bundle/`. Không tự tạo dữ liệu giả.

Sau khi copy, cấu trúc mong đợi trong `<RAG_FOLDER>`:

```text
<RAG_FOLDER>/
├── processed_pet_chunks.json
├── pgvector_bundle/
│   ├── .env.example
│   ├── check_embedding.py
│   ├── embed_pgvector.py
│   ├── embedding_client.py
│   ├── pgvector_schema.sql
│   ├── requirements.txt
│   └── search_pgvector.py
└── provenance/
    └── manifest.jsonl
```

## 3. Cài đặt và cấu hình

```bash
cd <RAG_FOLDER>
python -m venv .venv
source .venv/bin/activate
pip install -r pgvector_bundle/requirements.txt
cp pgvector_bundle/.env.example pgvector_bundle/.env
```

Sửa `pgvector_bundle/.env`:

```dotenv
DATABASE_URL=postgresql://postgres:MAT_KHAU@localhost:5432/pet_rag
PGVECTOR_TABLE=pet_chunks

EMBED_PROVIDER=gemini
EMBED_MODEL=gemini-embedding-001
EMBED_DIM=1536
EMBED_BATCH_SIZE=100
GEMINI_API_KEY=...
```

Lưu ý:

- Mật khẩu DB phải có trong `DATABASE_URL`; nếu có ký tự đặc biệt thì URL-encode.
- Không in, không copy, không commit `.env`.
- Thêm `.env`, `.venv/`, `__pycache__/` vào `.gitignore`.

## 4. Kiểm tra trước khi ingest

```bash
python pgvector_bundle/check_embedding.py
```

Kỳ vọng:

- `provider=gemini`, `model=gemini-embedding-001`, `dim=1536`.
- Embed thành công 2 câu, kể cả tiếng Việt, vector 1536 chiều.

Kiểm tra DB và extension:

```bash
psql "$DATABASE_URL" -c "SELECT extname FROM pg_extension WHERE extname='vector';"
```

Nếu chưa có:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Cần user có quyền phù hợp (thường là superuser hoặc user đã được cấp quyền).

## 5. Smoke test (bắt buộc trước khi chạy full)

```bash
python pgvector_bundle/embed_pgvector.py \
  --chunks processed_pet_chunks.json \
  --table pet_chunks_smoke \
  --limit 10
```

Sau đó search thử:

```bash
python pgvector_bundle/search_pgvector.py \
  "phác đồ tiêm phòng cho chó" \
  --table pet_chunks_smoke \
  --species dog \
  --top-k 3
```

và một câu tiếng Anh:

```bash
python pgvector_bundle/search_pgvector.py \
  "canine vaccination schedule" \
  --table pet_chunks_smoke \
  --species dog \
  --top-k 3
```

Báo lại kết quả. **Chỉ chạy full khi user xác nhận.**

## 6. Full ingest

```bash
python pgvector_bundle/embed_pgvector.py \
  --chunks processed_pet_chunks.json \
  --table pet_chunks
```

- 3296 chunks, batch mặc định 100.
- Có thể dùng `--skip-existing` để resume nếu bị ngắt.
- Script tự tạo bảng, metadata table, index HNSW cosine.
- Nếu đổi model/dimension phải dùng `--recreate` hoặc bảng mới.

Kiểm tra sau ingest:

```bash
python pgvector_bundle/search_pgvector.py \
  "chó bị tiêu chảy nên ăn gì" \
  --species dog \
  --top-k 5
```

## 7. Data contract — không được phá

`processed_pet_chunks.json` là mảng JSON:

```json
{
  "id": "01_Y_Khoa_Cap_Cuu_<file>_<index>",
  "content": "...",
  "metadata": {
    "category": "01_Y_Khoa_Cap_Cuu",
    "source_file": "...pdf",
    "species": "dog",
    "char_count": 337,
    "Header_1": "...",
    "Header_2": "...",
    "Header_3": "..."
  }
}
```

- `species` chỉ nhận: `dog`, `cat`, `both`, `general`.
- `category` hiện có:
  - `01_Y_Khoa_Cap_Cuu`
  - `02_Dinh_Duong_Doc_Chat`
  - `03_Grooming_Hanh_Vi`
- Không đổi `id`, `content`, `metadata` khi ingest.
- Không re-chunk trừ khi user yêu cầu rõ.
- Search với `dog`/`cat` tự động gồm cả chunk `both`.

## 8. Tiêu chí hoàn thành

- [ ] Đã xác định đúng folder RAG có sẵn ở root, không tạo folder mới.
- [ ] Copy đủ artifact, không copy `.env`/cache/venv.
- [ ] `check_embedding.py` chạy OK với Gemini 1536 chiều.
- [ ] Kết nối DB OK, extension `vector` có sẵn.
- [ ] Smoke test 10 chunks + 2 query chạy OK.
- [ ] Báo cáo rõ file đã tạo, bảng đã tạo, kết quả search.
- [ ] Không commit gì, không lộ API key/DB password.

## 9. Fallback

- Nếu Gemini lỗi 404/403: kiểm tra `GEMINI_API_KEY`, quyền model, hoặc thử `EMBED_MODEL=text-embedding-004` + `EMBED_DIM=768`.
- Nếu DB lỗi `password authentication failed`: bổ sung mật khẩu vào `DATABASE_URL`.
- Nếu DB chưa có pgvector: hướng dẫn user cài extension trước, không tự đổi sang vector store khác.
- Nếu không truy cập được nguồn artifact: dừng và hỏi user, không tự sinh chunk/PDF.
