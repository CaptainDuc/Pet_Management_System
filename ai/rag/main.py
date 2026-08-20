from fastapi import FastAPI

app = FastAPI(title="PetCare AI RAG Stub")

@app.get("/")
def read_root():
    return {"message": "PetCare AI RAG is running"}

@app.post("/query")
def query_rag(payload: dict):
    question = payload.get("question", "")
    return {
        "answer": f"[Stub RAG] Decoded clinical documents related to '{question}'. Suggested standard care path: Keep pet hydrated and seek vet consultation.",
        "confidence": 0.92
    }
