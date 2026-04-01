from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="AegisFlow AI Service")

class FloodRequest(BaseModel):
    location: str
    rainfall_mm: float
    duration_hours: int

@app.get("/")
async def root():
    return {"message": "AegisFlow AI Service is running", "status": "online"}

@app.post("/predict-flood")
async def predict_flood(request: FloodRequest):
    # Mock prediction logic
    risk_level = "Medium"
    if request.rainfall_mm > 100:
        risk_level = "High"
    elif request.rainfall_mm < 30:
        risk_level = "Low"
        
    return {
        "location": request.location,
        "risk_level": risk_level,
        "predicted_depth_cm": request.rainfall_mm * 0.5,
        "estimated_arrival_time": "2 hours"
    }

@app.get("/optimize-evacuation")
async def optimize_evacuation(start_node: str, end_node: str):
    return {
        "route": [start_node, "Node_A", "Node_B", end_node],
        "estimated_time_minutes": 15,
        "safety_score": 0.95
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
