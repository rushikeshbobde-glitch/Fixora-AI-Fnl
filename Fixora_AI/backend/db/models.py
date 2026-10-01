from datetime import datetime
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, JSON
from sqlalchemy.orm import relationship
from backend.db.database import Base


class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(180), unique=True, nullable=False)
    department = Column(String(120))
    created_at = Column(DateTime, default=datetime.utcnow)
    tickets = relationship("Ticket", back_populates="employee")


class KnowledgeArticle(Base):
    __tablename__ = "knowledge_articles"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    category = Column(String(80), nullable=False)
    content = Column(Text, nullable=False)
    steps = Column(JSON, default=list)
    tools = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)


class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    issue = Column(Text, nullable=False)
    category = Column(String(80))
    priority = Column(String(30))
    status = Column(String(40), default="NEW")
    diagnosis = Column(Text)
    resolution = Column(Text)
    escalation_reason = Column(Text)
    confidence = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    employee = relationship("Employee", back_populates="tickets")
    runs = relationship("AgentRun", back_populates="ticket", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="ticket", cascade="all, delete-orphan")
    actions = relationship("ToolAction", back_populates="ticket", cascade="all, delete-orphan")


class AgentRun(Base):
    __tablename__ = "agent_runs"
    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"))
    agent_name = Column(String(120), nullable=False)
    status = Column(String(30), nullable=False)
    output = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    ticket = relationship("Ticket", back_populates="runs")


class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"))
    source_code = Column(String(80), nullable=False)
    title = Column(String(250), nullable=False)
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    ticket = relationship("Ticket", back_populates="evidence")


class ToolAction(Base):
    __tablename__ = "tool_actions"
    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id", ondelete="CASCADE"))
    tool_name = Column(String(120), nullable=False)
    input = Column(JSON, default=dict)
    output = Column(JSON, default=dict)
    status = Column(String(30), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ticket = relationship("Ticket", back_populates="actions")
