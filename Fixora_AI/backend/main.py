from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.config import settings
from backend.db.database import Base, engine, get_db
from backend.db.models import Employee, Ticket
from backend.db.seed import seed_database
from backend.schemas import TicketCreate, TicketListItem, TicketResponse
from backend.agents.orchestrator import run_workflow

app = FastAPI(
    title="Fixora AI",
    description="Autonomous IT Service Desk & Resolution Agent",
    version="1.0.0"
)

origins = [x.strip() for x in settings.cors_origins.split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"ok": True, "service": "Fixora AI", "database": "PostgreSQL"}


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


@app.get("/api/tickets", response_model=list[TicketListItem])
def list_tickets(db: Session = Depends(get_db)):
    return db.query(Ticket).order_by(Ticket.id.desc()).limit(50).all()


@app.get("/api/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

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
            {"agent": r.agent_name, "output": r.output}
            for r in ticket.runs
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
