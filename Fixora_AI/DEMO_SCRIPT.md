# Fixora AI — Jury Demo Script

## 1. Opening

"Fixora AI is an Autonomous IT Service Desk and Resolution Agent for Problem Statement #12."

"Instead of one chatbot trying to do everything, we use specialized agents with separate responsibilities."

## 2. Show the workflow

Ticket → Triage → Knowledge/RAG → Diagnosis → Troubleshooting → Resolution → Verification → Escalation

## 3. Live example

Enter:

`My VPN is not connecting`

Click **Investigate Ticket**.

Explain:

- Triage identifies VPN + priority.
- Knowledge/RAG retrieves KB-VPN-001.
- Diagnosis identifies the likely VPN session/gateway problem.
- Troubleshooting selects approved steps.
- Resolution calls simulated VPN/network tools.
- Verification checks the simulated result.
- Escalation decides whether the case can remain automated.

## 4. Show PostgreSQL

Point to the ticket history and explain:

"Every ticket and agent stage is persisted in PostgreSQL, so the investigation is auditable instead of being only a chat response."

## 5. Safety demo

Enter:

`The production server is down and we may be losing customer data.`

The triage agent marks it critical and the escalation agent routes it to human review.

## 6. Closing

"The MVP does not touch real enterprise infrastructure. All IT actions are simulated, which lets us demonstrate the agent architecture safely while keeping the integration points ready for real IT systems."
