from fastapi import FastAPI, UploadFile, File

app = FastAPI(title="PetCare AI Vision Stub")

@app.get("/")
def read_root():
    return {"message": "PetCare AI Vision is running"}

@app.post("/analyze")
def analyze_image(file: UploadFile = File(...)):
    return {
        "filename": file.filename,
        "breed_detected": "Golden Retriever (Stub Model Match)",
        "confidence": 0.98,
        "anomalies": []
    }
