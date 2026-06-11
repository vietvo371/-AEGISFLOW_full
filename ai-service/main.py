from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from api.calculations import router as calculations_router
from api.alert_generator import router as alert_router
from api.realtime import router as realtime_router
from services.route_optimizer import get_route_optimizer

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

@app.get("/api/optimize-evacuation", tags=["routing"])
async def optimize_evacuation(
    start_lat: float = Query(..., description="Start latitude"),
    start_lng: float = Query(..., description="Start longitude"),
    end_lat: float = Query(..., description="End latitude"),
    end_lng: float = Query(..., description="End longitude"),
    flood_lat: Optional[float] = Query(None, description="Flooded area latitude"),
    flood_lng: Optional[float] = Query(None, description="Flooded area longitude"),
    flood_depth: float = Query(1.5, description="Flood depth in meters"),
):
    flooded_areas = []
    if flood_lat is not None and flood_lng is not None:
        flooded_areas.append({"lat": flood_lat, "lng": flood_lng, "depth_m": flood_depth})

    optimizer = get_route_optimizer()
    result = optimizer.calculate_optimal_route(
        start_lat=start_lat,
        start_lon=start_lng,
        end_lat=end_lat,
        end_lon=end_lng,
        flooded_areas=flooded_areas,
    )
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5005)
