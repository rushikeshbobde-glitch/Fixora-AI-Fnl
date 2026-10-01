@echo off
echo ===================================================
echo   FIXORA AI - Contributor Sync & Launch Script
echo ===================================================
echo.

echo [1/4] Fetching and pulling latest commits...
git fetch origin
git checkout feature/fixora-ai-it-service-desk
git pull origin feature/fixora-ai-it-service-desk

echo.
echo [2/4] Installing Python requirements...
pip install -r requirements.txt

echo.
echo [3/4] Installing Frontend NPM dependencies...
cd Fixora_AI\frontend
call npm install
cd ..\..

echo.
echo [4/4] Starting Servers...
echo Opening Backend Server in new window...
start cmd /k "cd Fixora_AI && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo Opening Frontend Dev Server in new window...
start cmd /k "cd Fixora_AI\frontend && npm run dev"

echo.
echo ===================================================
echo Fixora AI is launching!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ===================================================
pause
