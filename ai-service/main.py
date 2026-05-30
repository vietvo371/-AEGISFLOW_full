from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.calculations import router as calculations_router
from api.alert_generator import router as alert_router
from api.realtime import router as realtime_router

app = FastAPI(
    title="AegisFlow AI Service",
    description="AI and calculation services for flood prediction and rescue optimization",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(calculations_router, prefix="/api", tags=["calculations"])
app.include_router(alert_router, prefix="/api", tags=["cascade-alerts"])
app.include_router(realtime_router, prefix="/api", tags=["realtime"])

@app.get("/")
async def root():
    return {"message": "AegisFlow AI Service is running", "status": "online", "version": "2.0.0"}

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
