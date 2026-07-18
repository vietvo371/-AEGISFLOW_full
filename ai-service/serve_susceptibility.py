#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AegisFlow — Server DEMO tối giản cho Flood Susceptibility (Phase 04) + Realtime (Phase 05).

Chỉ mount router susceptibility → chạy được CHỈ với dependency serve nhẹ
(fastapi, uvicorn, scikit-learn==1.6.0, numpy, pandas, pyarrow, scipy, joblib) —
KHÔNG cần rasterio/GDAL, KHÔNG kéo các router nặng khác của main.py.

Chạy (cách CHUẨN — chỉ cần Python + pip), từ thư mục ai-service:
  python -m venv .venv
  .venv\Scripts\activate            # Linux/Mac: source .venv/bin/activate
  pip install -r requirements.txt
  uvicorn serve_susceptibility:app --host 0.0.0.0 --port 5005

Tuỳ chọn nếu máy CÓ SẴN uv (uv KHÔNG phải dependency của project):
  uv run --with-requirements requirements.txt uvicorn serve_susceptibility:app --port 5005

Sau đó mở:  http://localhost:5005/  (danh sách endpoint)
"""

from pathlib import Path
import sys

# Cho phép `from api...`/`from services...` khi chạy từ bất kỳ CWD nào.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.susceptibility import router as susceptibility_router

app = FastAPI(
    title="AegisFlow — Flood Susceptibility (demo)",
    description="Heatmap nguy cơ ngập (Phase 04) + rủi ro động realtime (Phase 05).",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo: cho phép mọi origin (web :3000, mobile, curl)
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(susceptibility_router, prefix="/api", tags=["susceptibility"])


@app.get("/")
def root():
    return {
        "service": "AegisFlow Flood Susceptibility (demo)",
        "endpoints": [
            "GET /api/susceptibility/info",
            "GET /api/susceptibility/point?lat=16.055&lon=108.216",
            "GET /api/susceptibility/grid",
            "GET /api/risk/live?lat=16.055&lon=108.216[&sim_rain_mm=120]",
            "GET /api/risk/live/grid?[sim_rain_mm=&min_risk=]",
            "GET /api/risk/live/status",
        ],
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5005)
