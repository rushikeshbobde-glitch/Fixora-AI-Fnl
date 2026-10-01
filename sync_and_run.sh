#!/bin/bash
echo "==================================================="
echo "  FIXORA AI - Contributor Sync & Launch Script"
echo "==================================================="
echo ""

echo "[1/4] Pulling latest commits from feature/fixora-ai-it-service-desk..."
git fetch origin
git checkout feature/fixora-ai-it-service-desk
git pull origin feature/fixora-ai-it-service-desk

echo ""
echo "[2/4] Installing Python requirements..."
pip install -r requirements.txt

echo ""
echo "[3/4] Installing Frontend NPM dependencies..."
cd Fixora_AI/frontend
npm install
cd ../..

echo ""
echo "[4/4] Starting Servers..."
echo "Starting Backend in background on port 8000..."
(cd Fixora_AI && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload) &

echo "Starting Frontend on port 5173..."
cd Fixora_AI/frontend && npm run dev
