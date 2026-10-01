from pydantic import BaseModel, Field
from typing import Any


class TicketCreate(BaseModel):
    issue: str = Field(min_length=3)
    employee_name: str = "Demo Employee"
    employee_email: str = "demo@fixora.local"


class TicketResponse(BaseModel):
    ticket_id: int
    status: str
    category: str | None
    priority: str | None
    diagnosis: str | None
    resolution: str | None
    escalation_reason: str | None
    confidence: float | None
    evidence: list[dict[str, Any]]
    workflow: list[dict[str, Any]]


class TicketListItem(BaseModel):
    id: int
    issue: str
    status: str
    category: str | None
    priority: str | None
