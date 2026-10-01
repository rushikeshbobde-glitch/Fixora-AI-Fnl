# 🚀 Fixora AI - 100% Free Cloud Computing Server Deployment Guide

This guide details how to deploy **Fixora AI** (Multi-Agent Autonomous IT Service Desk) to high-performance, **100% free cloud servers** with zero monthly cost, automatic HTTPS (SSL), and persistent API + Frontend hosting.

---

## 🌟 Option 1: Render.com (Recommended — 1-Click Docker Web Service)

Render provides **750 free compute hours/month**, automatic HTTPS SSL, continuous auto-deployment from GitHub, and built-in health checks.

### ⚡ 1-Click Deployment Steps:
1. Go to **[https://dashboard.render.com/](https://dashboard.render.com/)** and sign in with your GitHub account.
2. Click **New +** in the top right → Select **Web Service**.
3. Choose **Build and deploy from a Git repository** → Select your repository:  
   `rushikeshbobde-glitch/Fixora-AI-Fnl` (Branch: `main` or `feature/fixora-ai-it-service-desk`).
4. Fill in the settings:
   - **Name**: `fixora-ai`
   - **Region**: Oregon (US West) or Frankfurt (EU)
   - **Language / Runtime**: `Docker` *(Recommended: Uses the pre-configured multi-stage Dockerfile)*
   - **Instance Type**: `Free` ($0/month)
5. Click **Deploy Web Service**!
6. Render will automatically build the React Vite UI, start FastAPI Uvicorn, and provide you with a live URL like:  
   `https://fixora-ai.onrender.com`

---

## ⚡ Option 2: Koyeb (100% Free Nano Instance — Instant Global Edge)

Koyeb offers continuous free compute with zero sleep/cold-start issues on their Free Nano Tier.

### Steps:
1. Sign up at **[https://app.koyeb.com/](https://app.koyeb.com/)** using GitHub.
2. Click **Create App** → Select **GitHub**.
3. Select repo `rushikeshbobde-glitch/Fixora-AI-Fnl`.
4. Choose **Dockerfile** as the build method.
5. Set Exposed Port to `8000`.
6. Select **Free Nano** tier.
7. Click **Deploy** → Koyeb gives you an instant `https://<app-name>.koyeb.app` URL.

---

## 🤗 Option 3: Hugging Face Spaces (Free 2 vCPU + 16 GB RAM Container)

Hugging Face provides **free Docker computing spaces** with 2 vCPU cores, 16 GB RAM, and permanent public URL.

### Steps:
1. Go to **[https://huggingface.co/spaces](https://huggingface.co/spaces)** → Click **Create new Space**.
2. Set Space Name: `fixora-ai-service-desk`.
3. Select **Space SDK**: `Docker` → **Blank**.
4. Choose **Free CPU (2 vCPU · 16 GB RAM)**.
5. Push the repo or connect your GitHub repository.
6. Hugging Face automatically spins up the fullstack application!

---

## ▲ Option 4: Vercel (Free Serverless Deployment)

The repository includes pre-configured `vercel.json`, `build.js`, and `api/index.py`.

### Steps:
1. Go to **[https://vercel.com/new](https://vercel.com/new)** and import `rushikeshbobde-glitch/Fixora-AI-Fnl`.
2. **Framework Preset**: Other.
3. **Root Directory**: `./` (Leave as root).
4. Click **Deploy**.
5. Vercel runs `node build.js`, bundles the React SPA and routes `/api/*` to the Python ASGI serverless handler.

---

## 🛠️ Verification & Health Check

Once deployed to any platform, test the endpoints:
- **Frontend UI**: `https://<your-deployed-url>/`
- **System Health Status**: `https://<your-deployed-url>/api/system/status`
- **Interactive OpenAPI Docs**: `https://<your-deployed-url>/docs`
- **Execute IT Workflow**: Submit any support issue in the chat to watch the 7 AI agents triage, run diagnostics, query knowledge base, and resolve or escalate to on-call technicians in real-time!
