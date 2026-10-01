from backend.agents import (
    triage_agent,
    knowledge_agent,
    diagnosis_agent,
    troubleshooting_agent,
    resolution_agent,
    verification_agent,
    escalation_agent,
)
from backend.db.models import AgentRun, Evidence, ToolAction


def run_workflow(db, ticket):
    workflow = []

    triage = triage_agent.run(ticket.issue)
    ticket.category = triage["category"]
    ticket.priority = triage["priority"]
    workflow.append(("Ticket Triage Agent", triage))

    knowledge = knowledge_agent.run(db, triage["category"], issue_text=ticket.issue)
    workflow.append(("Knowledge / RAG Agent", {"matches": knowledge}))

    for item in knowledge:
        db.add(Evidence(
            ticket_id=ticket.id,
            source_code=item["code"],
            title=item["title"],
            reason=f"Matched: '{item['title']}' (Score: {item.get('relevance_score', 10)})"
        ))

    diagnosis = diagnosis_agent.run(triage["category"], knowledge)
    ticket.diagnosis = diagnosis["diagnosis"]
    workflow.append(("System Diagnosis Agent", diagnosis))

    troubleshooting = troubleshooting_agent.run(knowledge)
    workflow.append(("Troubleshooting Agent", troubleshooting))

    resolution = resolution_agent.run(troubleshooting["tools"])
    ticket.resolution = resolution["message"]
    workflow.append(("Resolution Agent", resolution))

    for action in resolution["actions"]:
        db.add(ToolAction(
            ticket_id=ticket.id,
            tool_name=action["name"],
            input={},
            output=action["result"],
            status="COMPLETED"
        ))

    verification = verification_agent.run(
        triage["category"],
        resolution["actions"]
    )
    workflow.append(("Verification Agent", verification))

    escalation = escalation_agent.run(
        triage["priority"],
        knowledge,
        verification
    )
    ticket.status = escalation["status"]
    ticket.escalation_reason = escalation["reason"]
    ticket.confidence = escalation["confidence"]

    workflow.append(("Escalation Agent", escalation))

    for name, output in workflow:
        db.add(AgentRun(
            ticket_id=ticket.id,
            agent_name=name,
            status="COMPLETED",
            output=output
        ))

    db.commit()

    return {
        "ticket_id": ticket.id,
        "status": ticket.status,
        "category": ticket.category,
        "priority": ticket.priority,
        "diagnosis": ticket.diagnosis,
        "resolution": ticket.resolution,
        "escalation_reason": ticket.escalation_reason,
        "confidence": ticket.confidence,
        "evidence": [
            {"code": e.source_code, "title": e.title, "reason": e.reason}
            for e in ticket.evidence
        ],
        "workflow": [
            {"agent": name, "output": output}
            for name, output in workflow
        ]
    }
