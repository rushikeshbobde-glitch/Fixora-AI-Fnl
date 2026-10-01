# Fixora AI — Autonomous IT Service Desk & Resolution Agent

**Problem Statement #12 MVP**

Fixora AI is an Agentic AI IT service desk that receives an employee IT problem, investigates it through specialized agents, retrieves evidence from a local knowledge base, diagnoses the issue, selects a simulated IT action, verifies the result, and decides whether human escalation is required.

## What this MVP demonstrates

**Ticket → Triage → Knowledge/RAG → System Diagnosis → Troubleshooting → Resolution → Verification → Escalation**

The MVP uses simulated IT systems and a local knowledge base. It does not access or modify real enterprise infrastructure.

## Stack

- **Frontend:** React + Vite
- **Backend:** FastAPI
- **AI:** Optional OpenAI-compatible API; deterministic local reasoning works without an API key
- **RAG:** Local keyword retrieval MVP
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy
- **API validation:** Pydantic
- **Mock IT tools:** VPN, network, authentication, device

## Requirements

- Node.js 20+
- Python 3.10+
- PostgreSQL 15+ **or Docker Desktop**
- pip

## Project structure

```text
Fixora_AI/
├── backend/
│   ├── agents/
│   │   ├── orchestrator.py
│   │   ├── triage_agent.py
│   │   ├── knowledge_agent.py
│   │   ├── diagnosis_agent.py
│   │   ├── troubleshooting_agent.py
│   │   ├── resolution_agent.py
│   │   ├── verification_agent.py
│   │   └── escalation_agent.py
│   ├── db/
│   │   ├── database.py
│   │   ├── models.py
│   │   └── seed.py
│   ├── tools/
│   │   └── mock_it_tools.py
│   ├── services/
│   │   └── ai_service.py
│   ├── main.py
│   ├── schemas.py
│   ├── config.py
│   └── requirements.txt
├── database/
│   └── schema.sql
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── docker-compose.yml
└── README.md
```

## 1. Start PostgreSQL

### Easiest option — Docker Desktop

From the project root:

```bat
docker compose up -d postgres
```

The PostgreSQL database will run on:

```text
localhost:5432
```

Database:

```text
fixora
```

User:

```text
fixora
```

Password:

```text
fixora
```

### If PostgreSQL is already installed

Create a database named `fixora` and update `DATABASE_URL` in `.env` if required.

## 2. Start backend

Windows:

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..
copy .env.example .env
cd backend
python main.py
```

Backend:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

On startup, Fixora creates the required PostgreSQL tables and seeds the local knowledge base.

## 3. Start frontend

Open another terminal:

```bat
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

## 4. Demo

1. Open the dashboard.
2. Create a ticket such as:
   - `My VPN is not connecting`
   - `My laptop cannot connect to Wi-Fi`
   - `I forgot my password and my account is locked`
   - `The office printer is not printing`
3. Click **Investigate**.
4. Watch the agent stages execute.
5. Review the retrieved evidence.
6. Review diagnosis, selected mock action, verification, and escalation decision.
7. Open the ticket history to show PostgreSQL persistence.

## 5. Example jury explanation

> "Fixora is not just a chatbot. The ticket enters a controlled multi-agent workflow. The triage agent classifies it, the knowledge agent retrieves evidence, the diagnosis agent identifies the likely cause, the troubleshooting agent selects an approved action, the resolution agent executes a simulated tool, the verification agent checks the result, and the escalation agent decides whether a human is required. PostgreSQL stores the ticket and complete investigation trail."

## Optional AI

The system works without an API key.

To enable an OpenAI-compatible endpoint, copy `.env.example` to `.env` and configure:

```env
AI_ENABLED=true
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
```

If these values are absent, Fixora uses deterministic local reasoning so the demo remains reproducible.

## Database

`database/schema.sql` contains the PostgreSQL schema.

The MVP stores:

- employees
- tickets
- agent runs
- knowledge articles
- evidence
- tool actions
- final resolutions

## Safety

This MVP uses **simulated IT systems only**.

No real VPN, Wi-Fi, identity provider, device-management platform, or enterprise server is accessed or modified.
