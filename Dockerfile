# =========================================================================
# Fixora AI - Multi-Stage Production Dockerfile (Free Cloud Server Optimized)
# Stage 1: Build React/Vite Frontend
# Stage 2: Serve Frontend SPA & FastAPI Backend via Uvicorn
# =========================================================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend source
COPY Fixora_AI/frontend/package*.json ./
RUN npm install

COPY Fixora_AI/frontend/ ./
RUN npm run build

# Stage 2: Production Python Runtime
FROM python:3.12-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PYTHONPATH=/app/Fixora_AI:/app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY Fixora_AI/ /app/Fixora_AI/
COPY api/ /app/api/

# Copy built frontend dist from Stage 1 into the backend static locations
COPY --from=frontend-builder /app/frontend/dist /app/Fixora_AI/frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/dist

# Expose port (Render, Koyeb, Railway, Hugging Face, Fly.io map dynamically via $PORT)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/system/status || exit 1

# Start FastAPI ASGI server
CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
