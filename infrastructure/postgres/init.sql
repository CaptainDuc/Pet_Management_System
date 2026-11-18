-- Enable pgvector extension for AI/RAG embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create database pet_rag for AI RAG service
SELECT 'CREATE DATABASE pet_rag'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'pet_rag')\gexec

