# Fixora AI — Contributor Synchronization & Execution Guide

This document contains the complete commit log and copy-pasteable commands to sync, build, and run **Fixora AI (Problem Statement #12)** on any development device (Windows, macOS, or Linux).

---

## 📜 Pushed Commits on `feature/fixora-ai-it-service-desk`

```text
ce3e381 fix(triage): decouple hardware boot failure from printer category and add cold reset runbook
5d11b68 docs: add contributor commit list and 1-click sync scripts for multi-device setup
0a546b7 feat(solutions): generate humanized specialist solutions with actionable step-by-step instructions
711439c feat(ui): implement official Fixora AI light-mode mockup interface with /api/support endpoint
1c40ec3 feat(voice-desk): add real-time AI audio calls, conversational chat hub, and voice-to-speech recovery pipeline
3b5e2e6 feat(frontdesk): transform UI into enterprise employee service portal with dynamic tool matrix and past ticket correlation
6daef0c chore(deploy): configure Vercel serverless ASGI routing and monorepo build scripts
5feb50b feat(frontend): build cyber-modern glassmorphism UI with live telemetry, simulation chips, and operator desk
e711075 feat(api): add operator action controls, knowledge base endpoints, and cloud database fallback
4e8b29f feat(backend): implement multi-agent IT reasoning workflow and autonomous remediation tools
be4ba72 fix: database universal compatibility and gitignore updates
2454ce6 Initial commit - Fixora AI Problem 12
```

---

## ⚡ Option A: Automated 1-Click Execution (Windows)

Double-click or run `SYNC_AND_RUN.bat` in the project root:

```cmd
SYNC_AND_RUN.bat
```

---

## 🛠️ Option B: Step-by-Step Terminal Commands (Any Device)

### **Step 1: Clone or Sync the Latest Branch**

#### If cloning for the first time:
```bash
git clone -b feature/fixora-ai-it-service-desk https://github.com/rushikeshbobde-glitch/Fixora-AI-Fnl.git
cd Fixora-AI-Fnl/Fixora_AI_Problem12_PostgreSQL_Complete
```

#### If repository is already cloned:
```bash
git fetch origin
git checkout feature/fixora-ai-it-service-desk
git pull origin feature/fixora-ai-it-service-desk
```

---

### **Step 2: Start the Backend Server (Terminal 1)**

```bash
# Navigate to backend directory
cd Fixora_AI

# Install Python requirements (if not installed)
pip install -r ../requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend will be running at: `http://127.0.0.1:8000`
* Interactive API Docs at: `http://127.0.0.1:8000/docs`

---

### **Step 3: Start the Frontend Dev Server (Terminal 2)**

```bash
# Navigate to frontend directory
cd Fixora_AI/frontend

# Install dependencies
npm install

# Start Vite dev server on port 5173
npm run dev
```
* Frontend interface will open at: `http://localhost:5173`

---

## 🧪 Verification & Demo Checklist

1. **Ask Fixora AI**:
   - Type `"My VPN is not connecting and corporate gateway keeps timing out."` or use the microphone 🎤.
   - Observe the **7-stage Agentic Resolution Trace** (`Triage` $\to$ `Knowledge` $\to$ `Diagnosis` $\to$ `Troubleshooting` $\to$ `Resolution` $\to$ `Verification`).
   - Fixora AI responds with a humanized specialist greeting, what was fixed, and step-by-step instructions.
2. **Quick Category Chips**:
   - Test 🔧 `Troubleshoot`, 👤 `Account Help`, 🪟 `Software`, 📶 `Network`.
3. **Recent Tickets**:
   - Confirm ticket `#INC-001` appears in the right sidebar with real-time status (`Resolved` / `In Progress` / `Pending`).
