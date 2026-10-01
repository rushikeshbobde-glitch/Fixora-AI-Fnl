#!/usr/bin/env bash
set -e

echo "==> Starting Fixora AI Service Desk..."
export PORT=${PORT:-8000}
export PYTHONPATH="/app/Fixora_AI:/app:."

# Run universal build if dist does not exist
if [ ! -d "dist" ] && [ ! -d "Fixora_AI/frontend/dist" ]; then
    echo "==> Dist folder not detected. Running build.js..."
    node build.js
fi

echo "==> Launching FastAPI Uvicorn on 0.0.0.0:${PORT}..."
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port "${PORT}"
