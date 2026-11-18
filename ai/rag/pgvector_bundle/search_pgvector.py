import argparse
import json
import os
import re

import psycopg

from embedding_client import EmbeddingConfig, embed_texts, vector_literal

IDENT = re.compile(r"^[a-z_][a-z0-9_]*$")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Tìm kiếm ngữ nghĩa trong PostgreSQL/pgvector."
    )
    parser.add_argument("query")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--species", choices=["dog", "cat", "both", "general"])
    parser.add_argument("--category")
    parser.add_argument(
        "--table",
        default=os.environ.get("PGVECTOR_TABLE", "pet_chunks"),
        help="Tên bảng chứa chunks",
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="Chuỗi kết nối PostgreSQL (mặc định lấy DATABASE_URL)",
    )
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def check_meta(conn, table, config):
    try:
        with conn.cursor() as cursor:
            cursor.execute(f"SELECT key, value FROM {table}_meta")
            meta = dict(cursor.fetchall())
    except psycopg.Error:
        conn.rollback()
        return
    stored_model = meta.get("embedding_model")
    stored_dim = meta.get("embedding_dim")
    if stored_model and stored_model != config.model:
        raise SystemExit(
            f"Bảng {table} được embed bằng {stored_model}, "
            f"không phải {config.model}. Đặt EMBED_MODEL đúng."
        )
    if stored_dim and int(stored_dim) != config.dim:
        raise SystemExit(
            f"Bảng {table} dùng {stored_dim} chiều, "
            f"không phải EMBED_DIM={config.dim}."
        )


def species_values(species):
    if species in ("dog", "cat"):
        return [species, "both"]
    return [species]


def main():
    args = parse_args()
    if not IDENT.match(args.table):
        raise SystemExit(
            "Tên bảng chỉ được gồm chữ thường, số, gạch dưới; bắt đầu bằng chữ."
        )
    if not args.database_url:
        raise SystemExit("Thiếu DATABASE_URL hoặc --database-url.")
    if args.top_k < 1:
        raise SystemExit("--top-k phải >= 1.")

    config = EmbeddingConfig().require_key()
    query_vector = vector_literal(
        embed_texts([args.query], task="query", config=config)[0]
    )

    with psycopg.connect(args.database_url, connect_timeout=15) as conn:
        check_meta(conn, args.table, config)

        conditions = []
        params = []
        if args.category:
            conditions.append("category = %s")
            params.append(args.category)
        if args.species:
            conditions.append("species = ANY(%s)")
            params.append(species_values(args.species))
        where_sql = "WHERE " + " AND ".join(conditions) if conditions else ""

        sql = f"""
            SELECT chunk_id, content, category, source_file, species,
                   header_1, header_2, header_3,
                   1 - (embedding <=> %s::vector) AS score
            FROM {args.table}
            {where_sql}
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        query_params = [query_vector] + params + [query_vector, args.top_k]

        with conn.cursor() as cursor:
            cursor.execute(sql, query_params)
            columns = [description.name for description in cursor.description]
            rows = [dict(zip(columns, row)) for row in cursor.fetchall()]

    payload = [
        {
            "chunk_id": row["chunk_id"],
            "score": row["score"],
            "content": row["content"],
            "category": row["category"],
            "source_file": row["source_file"],
            "species": row["species"],
            "header_1": row["header_1"],
            "header_2": row["header_2"],
            "header_3": row["header_3"],
        }
        for row in rows
    ]

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    print(f"\nTruy vấn: {args.query!r}")
    if args.species or args.category:
        print(f"Lọc: species={args.species} category={args.category}")
    for rank, row in enumerate(payload, start=1):
        heading = row["header_3"] or row["header_2"] or row["header_1"] or ""
        snippet = " ".join((row["content"] or "").split())[:280]
        print(f"\n[{rank}] score={row['score']:.4f} | {row['source_file']}")
        print(f"    category={row['category']} species={row['species']}")
        if heading:
            print(f"    heading={heading[:100]}")
        print(f"    {snippet}")


if __name__ == "__main__":
    main()
