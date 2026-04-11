from fastapi import FastAPI
from api.calculations import router as calculations_router

app = FastAPI(
    title="AegisFlow AI Service",
    description="AI and calculation services for flood prediction and rescue optimization",
    version="1.0.0"
)

# Include real routers
app.include_router(calculations_router, prefix="/api", tags=["calculations"])

@app.get("/")
async def root():
    return {"message": "AegisFlow AI Service is running", "status": "online", "version": "1.0.0"}

# Keep the mock optimize-evacuation for now as placeholder for later routing implementation
@app.get("/api/optimize-evacuation", tags=["routing"])
async def optimize_evacuation(start_node: str, end_node: str):
    return {
        "route": [start_node, "Node_A", "Node_B", end_node],
        "estimated_time_minutes": 15,
        "safety_score": 0.95
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5005)

