from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db.database import Base, engine, get_db, SessionLocal
from backend.db.models import Employee, Ticket, KnowledgeArticle, AgentRun
from backend.db.seed import seed_database
from backend.schemas import (
    TicketCreate,
    TicketListItem,
    TicketResponse,
    OperatorActionPayload,
    KnowledgeArticleSchema,
    VoiceChatRequest,
    VoiceChatResponse,
    SupportRequest,
    SupportResponse,
    SupportEvent
)
from backend.services.ai_service import synthesize_voice_response
from backend.agents.orchestrator import run_workflow



from contextlib import asynccontextmanager

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Database initialization notice: {e}")

# Ensure DB is initialized
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="Fixora AI",
    description="Autonomous IT Service Desk & Resolution Agent",
    version="1.0.0",
    lifespan=lifespan
)

origins = [x.strip() for x in settings.cors_origins.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins or not origins else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True, "service": "Fixora AI", "database": "PostgreSQL"}


@app.get("/api/kb", response_model=list[KnowledgeArticleSchema])
def list_knowledge_articles(db: Session = Depends(get_db)):
    return db.query(KnowledgeArticle).order_by(KnowledgeArticle.id.asc()).all()


@app.post("/api/tickets", response_model=TicketResponse)
def create_and_investigate(payload: TicketCreate, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(
        Employee.email == payload.employee_email
    ).first()

    if not employee:
        employee = Employee(
            name=payload.employee_name,
            email=payload.employee_email,
            department="Engineering"
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)

    ticket = Ticket(
        employee_id=employee.id,
        issue=payload.issue,
        status="INVESTIGATING"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return run_workflow(db, ticket)


@app.post("/api/chat", response_model=VoiceChatResponse)
def handle_voice_chat(payload: VoiceChatRequest, db: Session = Depends(get_db)):
    msg = payload.message.strip()
    msg_lower = msg.lower()

    # Determine if this message is a technical issue to triage & solve
    greetings = {"hi", "hello", "hey", "good morning", "good afternoon", "who are you", "what can you do", "help me", "start"}
    is_greeting = any(msg_lower.startswith(g) or msg_lower == g for g in greetings) and not any(k in msg_lower for k in ["vpn", "wifi", "password", "lock", "printer", "down", "error", "server", "outage"])

    tech_keywords = [
        "vpn", "wifi", "wi-fi", "network", "internet", "connect", "disconnect",
        "password", "lock", "account", "login", "auth", "sso", "directory",
        "printer", "print", "spooler", "paper", "jam", "offline",
        "server", "down", "outage", "database", "error", "failing", "broken", "stuck",
        "slow", "laptop", "device", "ip", "dhcp", "dns", "fix", "troubleshoot", "jamming"
    ]

    is_tech_issue = not is_greeting and (any(k in msg_lower for k in tech_keywords) or len(msg.split()) >= 4)


    if is_tech_issue:
        # Locate or create employee
        employee = db.query(Employee).filter(Employee.email == payload.employee_email).first()
        if not employee:
            employee = Employee(
                name=payload.employee_name,
                email=payload.employee_email,
                department="Corporate Staff"
            )
            db.add(employee)
            db.commit()
            db.refresh(employee)

        # Create ticket
        ticket = Ticket(
            employee_id=employee.id,
            issue=msg,
            status="INVESTIGATING"
        )
        db.add(ticket)
        db.commit()
        db.refresh(ticket)

        ticket_res = run_workflow(db, ticket)

        tools_executed = [dt.get("tool") for dt in ticket_res.get("dynamic_tools", []) if dt.get("decision") == "SELECTED"]
        if not tools_executed:
            tools_executed = ["diagnostic_inspection"]

        spoken_text = synthesize_voice_response(
            issue=ticket_res["issue"],
            status=ticket_res["status"],
            category=ticket_res.get("category") or "general",
            diagnosis=ticket_res.get("diagnosis") or "",
            resolution=ticket_res.get("resolution") or "",
            tools_executed=tools_executed
        )

        return VoiceChatResponse(
            reply=f"I've initiated an autonomous IT investigation for: **\"{msg}\"**.\n\n"
                  f"• **Diagnosis**: {ticket_res.get('diagnosis')}\n"
                  f"• **Actions Applied**: {ticket_res.get('resolution')}\n"
                  f"• **Status**: {ticket_res.get('status').replace('_', ' ')}",
            spoken_audio_text=spoken_text,
            ticket=ticket_res,
            action_type="AUTO_FIXED" if ticket_res["status"] == "RESOLUTION_READY" else "ESCALATED"
        )
    else:
        spoken = "Hello! I am Fixora AI, your autonomous IT helpdesk agent. Tell me what tech trouble you are experiencing or speak with me on this audio call to resolve it!"
        return VoiceChatResponse(
            reply=spoken,
            spoken_audio_text=spoken,
            ticket=None,
            action_type="CONVERSATIONAL"
        )



@app.post("/api/support", response_model=SupportResponse)
def handle_support_request(payload: SupportRequest, db: Session = Depends(get_db)):
    msg = payload.message.strip()

    # Locate or create employee
    employee = db.query(Employee).filter(Employee.email == payload.employee_email).first()
    if not employee:
        employee = Employee(
            name=payload.employee_name,
            email=payload.employee_email,
            department="Corporate User"
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)

    # Create ticket
    ticket = Ticket(
        employee_id=employee.id,
        issue=msg,
        status="INVESTIGATING"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    ticket_res = run_workflow(db, ticket)
    ticket_num = f"INC-{ticket.id:03d}"

    # Build standard 7-stage events array
    events = []
    workflow_dict = {w["agent"]: w["output"] for w in ticket_res.get("workflow", [])}

    triage_out = workflow_dict.get("Ticket Triage Agent", {})
    events.append(SupportEvent(
        stage="triage",
        name="Triage",
        status="completed",
        detail=f"Classified as {ticket_res.get('category', 'general')} issue; priority {ticket_res.get('priority', 'medium')}."
    ))

    events.append(SupportEvent(
        stage="knowledge",
        name="Knowledge / RAG",
        status="completed",
        detail=f"Retrieved relevant {ticket_res.get('category', 'IT')} troubleshooting article & previous ticket precedents."
    ))

    events.append(SupportEvent(
        stage="diagnosis",
        name="System Diagnosis",
        status="completed",
        detail=ticket_res.get("diagnosis") or "System parameters and diagnostics evaluated."
    ))

    tools_eval = ticket_res.get("dynamic_tools", [])
    selected_tools = [dt["tool"] for dt in tools_eval if dt.get("decision") == "SELECTED"]
    events.append(SupportEvent(
        stage="troubleshooting",
        name="Troubleshooting",
        status="completed",
        detail=f"Selected safe tools: {', '.join(selected_tools) if selected_tools else 'Standard diagnostic SOP'}."
    ))

    events.append(SupportEvent(
        stage="resolution",
        name="Resolution",
        status="completed",
        detail=ticket_res.get("resolution") or "Simulated diagnostic actions executed safely."
    ))

    is_verified = ticket_res.get("status") in ["RESOLUTION_READY", "RESOLVED_BY_HUMAN"]
    events.append(SupportEvent(
        stage="verification",
        name="Verification",
        status="completed" if is_verified else "failed",
        detail="Resolution verified successfully." if is_verified else "Verification indicates follow-up required."
    ))

    final_status = "resolved" if is_verified else "escalated"
    events.append(SupportEvent(
        stage="escalation",
        name="Escalation",
        status="completed",
        detail="Autonomous resolution confirmed and verified." if is_verified else "Safety boundary reached: escalated to Human IT Support."
    ))

    # Generate friendly reply text
    if is_verified:
        reply = (
            f"I diagnosed the issue as **{ticket_res.get('diagnosis')}**.\n"
            f"{ticket_res.get('resolution')} All verification checks passed and your issue is resolved."
        )
    else:
        reply = (
            f"I checked your issue and determined that **{ticket_res.get('escalation_reason')}**.\n"
            f"I have safely created ticket **#{ticket_num}** and escalated it to our Senior IT Support team with full diagnostic telemetry."
        )

    return SupportResponse(
        ticket_id=ticket.id,
        ticket_number=ticket_num,
        status=final_status,
        category=ticket_res.get("category"),
        priority=ticket_res.get("priority"),
        reply=reply,
        events=events,
        created_at=ticket.created_at
    )


@app.get("/api/tickets", response_model=list[TicketListItem])
def list_tickets(db: Session = Depends(get_db)):
    tickets = db.query(Ticket).order_by(Ticket.id.desc()).limit(50).all()
    return [
        TicketListItem(
            id=t.id,
            ticket_number=f"INC-{t.id:03d}",
            issue=t.issue,
            status="Resolved" if t.status in ["RESOLUTION_READY", "RESOLVED_BY_HUMAN"] else ("Escalated" if t.status in ["ESCALATE_TO_HUMAN", "DISPATCHED_TO_TIER2"] else "In Progress"),
            category=t.category,
            priority=t.priority,
            confidence=t.confidence,
            created_at=t.created_at
        )
        for t in tickets
    ]



@app.get("/api/system-status")
def get_system_status():
    return {
        "overall_status": "OPERATIONAL",
        "last_probed": "Just now",
        "services": [
            {"name": "Corporate VPN Gateway (vpn.fixora.internal)", "status": "OPERATIONAL", "latency": "18ms", "load": "42%"},
            {"name": "Azure AD / Directory Federation", "status": "OPERATIONAL", "latency": "35ms", "load": "18%"},
            {"name": "Office Network DHCP & DNS (1.1.1.1)", "status": "OPERATIONAL", "latency": "4ms", "load": "29%"},
            {"name": "Windows Print Spooler Hub", "status": "DEGRADED", "latency": "120ms", "load": "74%", "note": "Queue stall auto-remediated"},
            {"name": "PostgreSQL Telemetry Audit Store", "status": "OPERATIONAL", "latency": "2ms", "load": "11%"}
        ]
    }


@app.get("/api/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    workflow = [
        {"agent": r.agent_name, "output": r.output}
        for r in ticket.runs
    ]

    # Extract rich telemetry if stored in runs
    previous_tickets = []
    system_status = {}
    dynamic_tools = []
    for r in ticket.runs:
        if r.agent_name == "Knowledge / RAG Agent" and isinstance(r.output, dict):
            previous_tickets = r.output.get("previous_tickets_investigated", [])
        elif r.agent_name == "System Diagnosis Agent" and isinstance(r.output, dict):
            system_status = r.output.get("system_status", {})
        elif r.agent_name == "Troubleshooting Agent" and isinstance(r.output, dict):
            dynamic_tools = r.output.get("evaluated_tools", [])

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
        "previous_tickets": previous_tickets,
        "system_status": system_status,
        "dynamic_tools": dynamic_tools,
        "evidence": [
            {"code": e.source_code, "title": e.title, "reason": e.reason}
            for e in ticket.evidence
        ],
        "workflow": workflow
    }



@app.post("/api/tickets/{ticket_id}/action", response_model=TicketResponse)
def perform_operator_action(ticket_id: int, payload: OperatorActionPayload, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if payload.action == "DISPATCH_TIER2":
        ticket.status = "DISPATCHED_TO_TIER2"
        ticket.escalation_reason = payload.note or "Dispatched to Senior IT Support Queue with full agent telemetry."
    elif payload.action == "RESOLVE_MANUAL":
        ticket.status = "RESOLVED_BY_HUMAN"
        ticket.resolution = payload.note or "Resolved manually by IT Desk Operator."
    elif payload.action == "APPROVE_AUTO_FIX":
        ticket.status = "RESOLUTION_READY"
        ticket.resolution = "Operator approved autonomous resolution execution."
        ticket.escalation_reason = "Human supervisor override granted."
        ticket.confidence = 0.99

    db.add(AgentRun(
        ticket_id=ticket.id,
        agent_name="Human Operator Supervision",
        status="COMPLETED",
        output={
            "action_taken": payload.action,
            "operator_note": payload.note or "Action executed via Fixora Control Desk",
            "new_status": ticket.status
        }
    ))
    db.commit()
    db.refresh(ticket)

    return get_ticket(ticket_id, db)



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
