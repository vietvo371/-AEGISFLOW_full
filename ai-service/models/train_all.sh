#!/bin/bash
# Train all AI models for AegisFlow
# Usage: bash models/train_all.sh

set -e
cd "$(dirname "$0")/.."

echo "========================================"
echo "AegisFlow AI — Train All Models"
echo "========================================"

source venv/bin/activate 2>/dev/null || true

echo ""
echo "[1/2] Training Temporal XGBoost Forecaster (1h/3h/6h)..."
python models/train_lstm_model.py

echo ""
echo "[2/2] Training Graph Flood Spread Predictor..."
python models/train_graph_model.py

echo ""
echo "========================================"
echo "All models trained successfully!"
echo "Endpoints available:"
echo "  POST /api/predict/forecast"
echo "  POST /api/predict/spread"
echo "  POST /api/predict/spread/from-stations"
echo "  POST /api/ai/analyze"
echo "========================================"
