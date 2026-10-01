from backend.agents import (
    triage_agent,
    knowledge_agent,
    diagnosis_agent,
    troubleshooting_agent,
    resolution_agent,
    verification_agent,
    escalation_agent,
)
from backend.db.models import AgentRun, Evidence, ToolAction, Ticket


def run_workflow(db, ticket):
    workflow = []

    # 1. Ticket Triage Agent
    triage = triage_agent.run(ticket.issue)
    ticket.category = triage["category"]
    ticket.priority = triage["priority"]
    workflow.append(("Ticket Triage Agent", triage))

    # 2. Knowledge & Previous Tickets Investigation (Problem Statement #12)
    knowledge = knowledge_agent.run(db, triage["category"], issue_text=ticket.issue)
    
    # Query previous similar tickets from PostgreSQL
    previous_tickets_query = db.query(Ticket).filter(
        Ticket.id != ticket.id
    ).order_by(Ticket.id.desc()).limit(3).all()
    
    previous_tickets_data = [
        {
            "ticket_id": pt.id,
            "issue": pt.issue,
            "category": pt.category,
            "priority": pt.priority,
            "status": pt.status,
            "resolution": pt.resolution or "Resolved via automated remediation"
        }
        for pt in previous_tickets_query
        if pt.category == triage["category"] or any(k in (pt.issue or "").lower() for k in (ticket.issue or "").lower().split())
    ]
    if not previous_tickets_data and previous_tickets_query:
        # Fallback to recent tickets for historical context
        previous_tickets_data = [
            {
                "ticket_id": pt.id,
                "issue": pt.issue,
                "category": pt.category,
                "priority": pt.priority,
                "status": pt.status,
                "resolution": pt.resolution or "Historical audit record"
            }
            for pt in previous_tickets_query[:2]
        ]

    workflow.append(("Knowledge / RAG Agent", {
        "matches": knowledge,
        "previous_tickets_investigated": previous_tickets_data
    }))

    for item in knowledge:
        db.add(Evidence(
            ticket_id=ticket.id,
            source_code=item["code"],
            title=item["title"],
            reason=f"Matched: '{item['title']}' (Score: {item.get('relevance_score', 10)})"
        ))

    # 3. System Diagnosis Agent (Probing System Status)
    diagnosis = diagnosis_agent.run(triage["category"], knowledge, issue_text=ticket.issue)
    ticket.diagnosis = diagnosis["diagnosis"]
    workflow.append(("System Diagnosis Agent", diagnosis))

    # 4. Troubleshooting Agent (Dynamic Tool Selection Engine)
    troubleshooting = troubleshooting_agent.run(knowledge, category=triage["category"], issue_text=ticket.issue)
    workflow.append(("Troubleshooting Agent", troubleshooting))

    # 5. Resolution Agent (Safe Tool Execution)
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

    # 6. Verification Agent (Output Validation)
    verification = verification_agent.run(
        triage["category"],
        resolution["actions"]
    )
    workflow.append(("Verification Agent", verification))

    # 7. Escalation Agent (Safety Boundaries)
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
        "issue": ticket.issue,
        "status": ticket.status,
        "category": ticket.category,
        "priority": ticket.priority,
        "diagnosis": ticket.diagnosis,
        "resolution": ticket.resolution,
        "escalation_reason": ticket.escalation_reason,
        "confidence": ticket.confidence,
        "created_at": ticket.created_at,
        "previous_tickets": previous_tickets_data,
        "system_status": diagnosis.get("system_status", {}),
        "dynamic_tools": troubleshooting.get("evaluated_tools", []),
        "evidence": [
            {"code": e.source_code, "title": e.title, "reason": e.reason}
            for e in ticket.evidence
        ],
        "workflow": [
            {"agent": name, "output": output}
            for name, output in workflow
        ]
    }

