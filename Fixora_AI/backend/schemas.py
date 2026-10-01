from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime


class TicketCreate(BaseModel):
    issue: str = Field(min_length=3)
    employee_name: str = "Demo Employee"
    employee_email: str = "demo@fixora.local"


class TicketResponse(BaseModel):
    ticket_id: int
    issue: str | None = None
    status: str
    category: str | None
    priority: str | None
    diagnosis: str | None
    resolution: str | None
    escalation_reason: str | None
    confidence: float | None
    evidence: list[dict[str, Any]]
    workflow: list[dict[str, Any]]
    created_at: datetime | None = None
    previous_tickets: list[dict[str, Any]] = []
    system_status: dict[str, Any] = {}
    dynamic_tools: list[dict[str, Any]] = []



class TicketListItem(BaseModel):
    id: int
    ticket_number: str | None = None
    issue: str
    status: str
    category: str | None
    priority: str | None
    confidence: float | None = None
    created_at: datetime | None = None


class OperatorActionPayload(BaseModel):
    action: str
    note: str | None = None


class KnowledgeArticleSchema(BaseModel):
    code: str
    title: str
    category: str
    content: str
    steps: list[str] = []
    tools: list[str] = []


class VoiceChatRequest(BaseModel):
    message: str = Field(min_length=1)
    ticket_id: int | None = None
    employee_name: str = "Jane Doe"
    employee_email: str = "jane.doe@fixora.local"
    is_voice_call: bool = False


class VoiceChatResponse(BaseModel):
    reply: str
    spoken_audio_text: str
    ticket: TicketResponse | None = None
    action_type: str = "CONVERSATIONAL"


class SupportEvent(BaseModel):
    stage: str
    name: str
    status: str
    detail: str


class SupportRequest(BaseModel):
    message: str = Field(min_length=1)
    source: str = "text"
    employee_name: str = "Sarah Connor"
    employee_email: str = "sarah.connor@fixora.local"


class SupportResponse(BaseModel):
    ticket_id: int
    ticket_number: str
    status: str
    category: str | None = None
    priority: str | None = None
    reply: str
    events: list[SupportEvent] = []
    created_at: datetime | None = None



