from fastapi import FastAPI

app = FastAPI(title="PetCare AI Forecasting Stub")

@app.get("/")
def read_root():
    return {"message": "PetCare AI Forecasting is running"}

@app.post("/forecast")
def forecast(payload: dict):
    metric = payload.get("metric", "booking_demand")
    return {
        "metric": metric,
        "forecasted_values": [
            {"date": "2026-08-21", "value": 150},
            {"date": "2026-08-22", "value": 175},
            {"date": "2026-08-23", "value": 210}
        ]
    }
