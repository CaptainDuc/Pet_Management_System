from fastapi import FastAPI

app = FastAPI(title="PetCare AI Optimization Stub")

@app.get("/")
def read_root():
    return {"message": "PetCare AI Optimization is running"}

@app.post("/optimize")
def optimize(payload: dict):
    return {
        "optimized_shifts": [
            {"staff_id": "a4c28f1b-3b7c-48d8-99dc-716095da1234", "branch_id": "b1b2b3b4-1234-5678-abcd-ef1234567890", "shift": "morning"},
            {"staff_id": "b5d39f2c-4c8d-59e9-aade-8271adab2345", "branch_id": "b1b2b3b4-1234-5678-abcd-ef1234567890", "shift": "afternoon"}
        ]
    }
