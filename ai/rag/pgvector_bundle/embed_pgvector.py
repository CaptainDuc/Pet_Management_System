import argparse
import json
import os
import re
import time

import psycopg

from embedding_client import EmbeddingConfig, embed_texts, vector_literal

IDENT = re.compile(r"^[a-z_][a-z0-9_]*$")

INSERT_SQL = """
INSERT INTO {table} (
    chunk_id, content, category, source_file, species,
    header_1, header_2, header_3, char_count, embedding
)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
ON CONFLICT (chunk_id) DO UPDATE SET
    content = EXCLUDED.content,
    category = EXCLUDED.category,
    source_file = EXCLUDED.source_file,
    species = EXCLUDED.species,
    header_1 = EXCLUDED.header_1,
    header_2 = EXCLUDED.header_2,
    header_3 = EXCLUDED.header_3,
    char_count = EXCLUDED.char_count,
    embedding = EXCLUDED.embedding
"""


def parse_args():
    parser = argparse.ArgumentParser(
        description="Embed chunks và nạp vào PostgreSQL/pgvector."
    )
    parser.add_argument(
        "--chunks",
        default=os.environ.get("CHUNKS_FILE", "processed_pet_chunks.json"),
        help="Đường dẫn processed_pet_chunks.json",
    )
    parser.add_argument(
        "--table",
        default=os.environ.get("PGVECTOR_TABLE", "pet_chunks"),
        help="Tên bảng đích",
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="Chuỗi kết nối PostgreSQL (mặc định lấy DATABASE_URL)",
    )
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument(
        "--batch-interval",
        type=float,
        default=float(os.environ.get("EMBED_BATCH_INTERVAL_SECONDS", "0")),
        help="Nghỉ giữa các batch để tránh vượt quota API (giây)",
    )
    parser.add_argument(
        "--initial-delay",
        type=float,
        default=float(os.environ.get("EMBED_INITIAL_DELAY_SECONDS", "0")),
        help="Nghỉ trước batch đầu tiên (giây)",
    )
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--recreate", action="store_true")
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--init-only", action="store_true")
    parser.add_argument("--skip-index", action="store_true")
    parser.add_argument(
        "--report",
        default="pgvector_ingest_report.json",
        help="File báo cáo kết quả",
    )
    return parser.parse_args()


def load_chunks(path, limit):
    with open(path, encoding="utf-8") as handle:
        chunks = json.load(handle)
    if not isinstance(chunks, list):
        raise SystemExit(f"{path} phải là một mảng JSON.")
    if limit:
        chunks = chunks[:limit]
    result = []
    for chunk in chunks:
        content = (chunk.get("content") or "").strip()
        if not content:
            continue
        item = dict(chunk)
        item["content"] = content
        result.append(item)
    return result


def table_exists(conn, table):
    with conn.cursor() as cursor:
        cursor.execute("SELECT to_regclass(%s)", (table,))
        return cursor.fetchone()[0] is not None


def ensure_schema(conn, table, dim, recreate):
    with conn.cursor() as cursor:
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
        except psycopg.Error as error:
            conn.rollback()
            raise SystemExit(
                "Không tạo được extension vector. "
                "Chạy CREATE EXTENSION vector; bằng user có quyền superuser."
            ) from error

        if recreate:
            cursor.execute(f"DROP TABLE IF EXISTS {table}")
            cursor.execute(f"DROP TABLE IF EXISTS {table}_meta")

        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {table} (
                chunk_id text PRIMARY KEY,
                content text NOT NULL,
                category text,
                source_file text,
                species text,
                header_1 text,
                header_2 text,
                header_3 text,
                char_count integer,
                embedding vector({dim}) NOT NULL
            )
            """
        )
        cursor.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {table}_meta (
                key text PRIMARY KEY,
                value text NOT NULL
            )
            """
        )
        cursor.execute(
            """
            SELECT format_type(atttypid, atttypmod)
            FROM pg_attribute
            WHERE attrelid = %s::regclass
              AND attname = 'embedding'
              AND NOT attisdropped
            """,
            (table,),
        )
        row = cursor.fetchone()
        if not row:
            conn.rollback()
            raise SystemExit(f"Không tìm thấy cột embedding trong bảng {table}.")
        match = re.search(r"\((\d+)\)", row[0])
        existing_dim = int(match.group(1)) if match else None
        if existing_dim != dim:
            conn.rollback()
            raise SystemExit(
                f"Bảng {table} đang dùng vector({existing_dim}) "
                f"nhưng EMBED_DIM={dim}. Dùng --recreate hoặc bảng khác."
            )
        cursor.execute(
            f"CREATE INDEX IF NOT EXISTS {table}_category_idx ON {table} (category)"
        )
        cursor.execute(
            f"CREATE INDEX IF NOT EXISTS {table}_species_idx ON {table} (species)"
        )
    conn.commit()


def read_meta(conn, table):
    if not table_exists(conn, table):
        return {}
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT key, value FROM {table}_meta")
            return dict(cursor.fetchall())
    except psycopg.Error:
        conn.rollback()
        return {}


def write_meta(conn, table, values):
    with conn.cursor() as cursor:
        for key, value in values.items():
            cursor.execute(
                f"""
                INSERT INTO {table}_meta (key, value) VALUES (%s, %s)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                """,
                (key, str(value)),
            )
    conn.commit()


def existing_ids(conn, table):
    if not table_exists(conn, table):
        return set()
    with conn.cursor() as cursor:
        cursor.execute(f"SELECT chunk_id FROM {table}")
        return {row[0] for row in cursor.fetchall()}


def build_row(chunk, vector):
    metadata = chunk.get("metadata") or {}
    return (
        chunk["id"],
        chunk["content"],
        metadata.get("category"),
        metadata.get("source_file"),
        metadata.get("species"),
        metadata.get("Header_1"),
        metadata.get("Header_2"),
        metadata.get("Header_3"),
        metadata.get("char_count") or len(chunk["content"]),
        vector_literal(vector),
    )


def create_index(conn, table, dim):
    if dim > 2000:
        print(
            f"Bỏ qua HNSW: vector({dim}) vượt 2000 chiều. "
            "Đặt EMBED_DIM<=2000 nếu cần index."
        )
        return
    with conn.cursor() as cursor:
        cursor.execute(
            f"""
            CREATE INDEX IF NOT EXISTS {table}_embedding_hnsw
            ON {table} USING hnsw (embedding vector_cosine_ops)
            """
        )
        cursor.execute(f"ANALYZE {table}")
    conn.commit()


def count_rows(conn, table):
    with conn.cursor() as cursor:
        cursor.execute(f"SELECT count(*) FROM {table}")
        return cursor.fetchone()[0]


def main():
    args = parse_args()
    if not IDENT.match(args.table):
        raise SystemExit(
            "Tên bảng chỉ được gồm chữ thường, số, gạch dưới; bắt đầu bằng chữ."
        )
    if not args.database_url:
        raise SystemExit("Thiếu DATABASE_URL hoặc --database-url.")

    config = EmbeddingConfig()
    if args.batch_size:
        config.batch_size = args.batch_size
    if not args.init_only:
        config.require_key()
    if config.batch_size < 1:
        raise SystemExit("--batch-size phải >= 1.")

    print(f"Embedding: {json.dumps(config.summary(), ensure_ascii=False)}")
    print(f"Bảng đích: {args.table}")

    with psycopg.connect(args.database_url, connect_timeout=15) as conn:
        ensure_schema(conn, args.table, config.dim, args.recreate)
        if args.init_only:
            print("Đã khởi tạo schema.")
            return

        chunks = load_chunks(args.chunks, args.limit)
        print(f"Đã nạp {len(chunks)} chunks từ {args.chunks}")

        meta = read_meta(conn, args.table)
        stored_model = meta.get("embedding_model")
        if not args.recreate and stored_model and stored_model != config.model:
            raise SystemExit(
                f"Bảng đang chứa vector của model {stored_model}, "
                f"không phải {config.model}. Dùng --recreate hoặc bảng khác."
            )

        if args.skip_existing:
            done = existing_ids(conn, args.table)
            before = len(chunks)
            chunks = [chunk for chunk in chunks if chunk["id"] not in done]
            print(f"Bỏ qua {before - len(chunks)} chunks đã có.")

        write_meta(
            conn,
            args.table,
            {
                "embedding_provider": config.provider,
                "embedding_model": config.model,
                "embedding_dim": config.dim,
            },
        )

        if not chunks:
            print("Không có chunk mới cần nạp.")
            create_index(conn, args.table, config.dim)
            total = count_rows(conn, args.table)
            write_meta(conn, args.table, {"chunks": total})
            return

        insert_sql = INSERT_SQL.format(table=args.table)
        started = time.time()
        indexed = 0

        if args.initial_delay > 0:
            print(f"  Chờ {args.initial_delay:.0f}s để quota API hồi phục...")
            time.sleep(args.initial_delay)

        for offset in range(0, len(chunks), config.batch_size):
            if offset > 0 and args.batch_interval > 0:
                time.sleep(args.batch_interval)
            batch = chunks[offset : offset + config.batch_size]
            texts = [chunk["content"] for chunk in batch]
            vectors = embed_texts(texts, task="document", config=config)
            rows = [
                build_row(chunk, vector) for chunk, vector in zip(batch, vectors)
            ]
            with conn.cursor() as cursor:
                cursor.executemany(insert_sql, rows)
            conn.commit()
            indexed += len(batch)
            elapsed = time.time() - started
            rate = indexed / elapsed if elapsed else 0
            print(f"  {indexed}/{len(chunks)} chunks ({rate:.1f}/s)")

        total = count_rows(conn, args.table)
        write_meta(
            conn,
            args.table,
            {
                "chunks": total,
                "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            },
        )
        if not args.skip_index:
            create_index(conn, args.table, config.dim)

    report = {
        "table": args.table,
        "provider": config.provider,
        "model": config.model,
        "dim": config.dim,
        "chunks_written": indexed,
        "chunks_total": total,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    with open(args.report, "w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)

    print(f"\nĐã ghi {indexed} chunks vào bảng {args.table}.")
    print(f"Tổng số chunk trong bảng: {total}")
    print(f"Báo cáo: {args.report}")


if __name__ == "__main__":
    main()
