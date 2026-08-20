from fastapi import FastAPI

app = FastAPI(title="PetCare AI Recommendation Stub")

@app.get("/")
def read_root():
    return {"message": "PetCare AI Recommendation is running"}

@app.post("/recommend")
def recommend(payload: dict):
    pet_id = payload.get("pet_id", "")
    return {
        "recommended_services": [
            {"service_id": "a4c28f1b-3b7c-48d8-99dc-716095da1234", "name": "Standard Grooming", "score": 0.95},
            {"service_id": "b5d39f2c-4c8d-59e9-aade-8271adab2345", "name": "Dental Checkup", "score": 0.81}
        ]
    }
