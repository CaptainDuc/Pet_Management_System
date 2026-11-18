CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS pet_chunks (
    chunk_id text PRIMARY KEY,
    content text NOT NULL,
    category text,
    source_file text,
    species text,
    header_1 text,
    header_2 text,
    header_3 text,
    char_count integer,
    embedding vector(:dim) NOT NULL
);

CREATE INDEX IF NOT EXISTS pet_chunks_category_idx ON pet_chunks (category);
CREATE INDEX IF NOT EXISTS pet_chunks_species_idx ON pet_chunks (species);

CREATE TABLE IF NOT EXISTS pet_chunks_meta (
    key text PRIMARY KEY,
    value text NOT NULL
);
