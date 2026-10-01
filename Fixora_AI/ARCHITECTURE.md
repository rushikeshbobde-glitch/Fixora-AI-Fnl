# Fixora AI Architecture

```text
React + Vite
     |
     | REST API
     v
FastAPI Backend
     |
     v
Agent Orchestrator
     |
     +--> Ticket Triage Agent
     |
     +--> Knowledge / RAG Agent ----> PostgreSQL Knowledge Base
     |
     +--> System Diagnosis Agent
     |
     +--> Troubleshooting Agent
     |
     +--> Resolution Agent ---------> Mock IT Tools
     |
     +--> Verification Agent
     |
     +--> Escalation Agent
     |
     v
PostgreSQL
  ├── Employees
  ├── Tickets
  ├── Agent Runs
  ├── Evidence
  ├── Tool Actions
  └── Knowledge Articles
```

## Why it is agentic

Each stage has a distinct responsibility. The orchestrator passes structured output between stages, retrieves evidence, selects simulated tools, verifies the result, and applies a human-escalation safety gate.

## PostgreSQL role

PostgreSQL is the persistent system of record for:

- ticket history
- employee records
- knowledge articles
- agent execution records
- evidence
- simulated tool actions
- final resolution and escalation state
