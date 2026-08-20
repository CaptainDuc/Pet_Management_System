from fastapi import FastAPI
import os

app = FastAPI(title="PetCare AI Agent Stub")

@app.get("/")
def read_root():
    return {"message": "PetCare AI Agent is running"}

@app.post("/chat")
def chat(payload: dict):
    user_message = payload.get("message", "")
    return {
        "response": f"[Stub Agent] Executed task or answered question: '{user_message}'",
        "intent": "general_inquiry"
    }
