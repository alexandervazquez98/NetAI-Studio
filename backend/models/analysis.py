from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from backend.database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="running")  # running | done | error
    summary = Column(Text, nullable=True)
    alert_count = Column(Integer, default=0)
    raw_result = Column(JSON, nullable=True)

    log_entries = relationship(
        "LogEntry", back_populates="analysis", cascade="all, delete-orphan"
    )
    alerts = relationship(
        "Alert", back_populates="analysis", cascade="all, delete-orphan"
    )


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    severity = Column(String, nullable=False)  # critical | warning | info
    node = Column(String, nullable=True)
    site = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    impact = Column(Text, nullable=True)
    metric = Column(String, nullable=True)
    threshold = Column(String, nullable=True)

    analysis = relationship("Analysis", back_populates="alerts")


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    analysis_id = Column(String, ForeignKey("analyses.id"), nullable=False)
    agent = Column(String, nullable=False)
    level = Column(String, default="info")  # info | warning | error
    message = Column(Text, nullable=False)
    tool_call = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    analysis = relationship("Analysis", back_populates="log_entries")
