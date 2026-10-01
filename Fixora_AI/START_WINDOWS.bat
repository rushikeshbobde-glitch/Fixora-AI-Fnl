@echo off
title Fixora AI - PostgreSQL + FastAPI + React
echo ================================================
echo Fixora AI - Autonomous IT Service Desk
echo ================================================
echo.
echo Starting PostgreSQL with Docker...
docker compose up -d postgres
if errorlevel 1 (
  echo.
  echo Docker/PostgreSQL could not be started.
  echo Install Docker Desktop or start PostgreSQL manually.
  pause
  exit /b 1
)

echo.
echo Start the backend in Terminal 1:
echo   cd backend
echo   python -m venv .venv
echo   .venv\Scripts\activate
echo   pip install -r requirements.txt
echo   cd ..
echo   copy .env.example .env
echo   python -m backend.main
echo.
echo Start the frontend in Terminal 2:
echo   cd frontend
echo   npm install
echo   npm run dev
echo.
echo PostgreSQL: localhost:5432
echo Backend:    http://127.0.0.1:8000
echo API docs:   http://127.0.0.1:8000/docs
echo Frontend:   http://localhost:5173
echo.
pause
