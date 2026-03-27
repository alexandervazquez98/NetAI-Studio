import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.config import settings
from backend.database import get_db
from backend.models.analysis import Analysis
from backend.models.graph import NetworkEdge, NetworkNode, Site
from backend.models.schemas import ChatRequestSchema, ChatResponseSchema
from backend.utils.graph_builder import build_network_graph_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])

# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------

_SESSION_TTL = timedelta(hours=1)


class _Session:
    def __init__(self) -> None:
        self.messages: List[Dict[str, str]] = []
        self.last_active: datetime = datetime.now(timezone.utc)

    def touch(self) -> None:
        self.last_active = datetime.now(timezone.utc)

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) - self.last_active > _SESSION_TTL


_SESSION_STORE: Dict[str, _Session] = {}


def _get_or_create_session(session_id: Optional[str]) -> tuple[str, _Session]:
    """Return (session_id, session). Creates a new session if id is None or expired."""
    if session_id and session_id in _SESSION_STORE:
        session = _SESSION_STORE[session_id]
        if not session.is_expired():
            session.touch()
            return session_id, session
        # Expired — fall through to create new
        del _SESSION_STORE[session_id]

    new_id = str(uuid.uuid4())
    _SESSION_STORE[new_id] = _Session()
    logger.debug("Chat: created new session %s", new_id)
    return new_id, _SESSION_STORE[new_id]


async def _cleanup_expired_sessions() -> None:
    """Background task: periodically evict expired sessions."""
    while True:
        await asyncio.sleep(300)  # run every 5 minutes
        expired = [sid for sid, s in list(_SESSION_STORE.items()) if s.is_expired()]
        for sid in expired:
            _SESSION_STORE.pop(sid, None)
        if expired:
            logger.info("Chat: evicted %d expired sessions", len(expired))


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

CHAT_SYSTEM_PROMPT = """Eres el asistente de red de una organización. Tienes acceso al estado actual de la red
a través del contexto que se te proporciona. Responde en lenguaje natural y claro,
sin jerga innecesaria cuando hablas con el usuario. Cuando se te pregunten cosas técnicas,
puedes usar terminología de redes pero siempre explicando el impacto en negocio.

Limitaciones que debes conocer:
- Sedes F y G tienen visibilidad limitada (SD-WAN de terceros).
- Solo puedes sugerir cambios de configuración; no los ejecutas directamente.
- Si el usuario quiere aplicar un cambio, dile que use el botón "Aprobar" en la tarjeta de sugerencias."""


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------

async def _build_context(db: AsyncSession) -> str:
    """Build a textual context string from the current DB state."""
    sites = (await db.execute(select(Site))).scalars().all()
    nodes = (await db.execute(select(NetworkNode))).scalars().all()
    edges = (await db.execute(select(NetworkEdge))).scalars().all()
    topology = build_network_graph_json(sites, nodes, edges)

    result = await db.execute(
        select(Analysis)
        .options(selectinload(Analysis.alerts))
        .where(Analysis.status == "done")
        .order_by(desc(Analysis.created_at))
        .limit(1)
    )
    analysis = result.scalar_one_or_none()

    context_parts = [
        "=== TOPOLOGÍA DE RED ===",
        json.dumps(topology, indent=2, default=str),
    ]

    if analysis:
        context_parts += [
            "\n=== ÚLTIMO ANÁLISIS ===",
            f"Fecha: {analysis.created_at.isoformat()}",
            f"Resumen: {analysis.summary or 'Sin resumen'}",
            f"Alertas activas: {analysis.alert_count}",
        ]
        if analysis.alerts:
            context_parts.append("Alertas:")
            for alert in analysis.alerts:
                context_parts.append(
                    f"  [{alert.severity.upper()}] {alert.site or ''} / {alert.node or ''}: {alert.description}"
                )
    else:
        context_parts.append("\n=== SIN ANÁLISIS PREVIO ===")

    return "\n".join(context_parts)


# ---------------------------------------------------------------------------
# Startup cleanup task registration
# ---------------------------------------------------------------------------

_cleanup_task_started = False


def ensure_cleanup_task() -> None:
    """Start the session cleanup background task (idempotent)."""
    global _cleanup_task_started
    if not _cleanup_task_started:
        asyncio.create_task(_cleanup_expired_sessions())
        _cleanup_task_started = True


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/", response_model=ChatResponseSchema)
async def chat(
    request: ChatRequestSchema,
    db: AsyncSession = Depends(get_db),
) -> ChatResponseSchema:
    """
    Handle a chat message from the user.
    Uses session_id to maintain conversation history across requests.
    If session_id is omitted or expired, a new session is started.
    """
    ensure_cleanup_task()

    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail="Anthropic API key not configured. Set ANTHROPIC_API_KEY.",
        )

    session_id, session = _get_or_create_session(request.session_id)

    try:
        context = await _build_context(db)
    except Exception as exc:
        logger.warning("Failed to build chat context: %s", exc)
        context = "No hay contexto de red disponible en este momento."

    # Inject network context as the first system-level user message when session is new
    if not session.messages:
        session.messages.append({
            "role": "user",
            "content": f"=== CONTEXTO DE RED ACTUAL ===\n{context}\n\n[Usa este contexto para responder todas mis preguntas en esta sesión.]",
        })
        session.messages.append({
            "role": "assistant",
            "content": "Entendido. Tengo acceso al estado actual de la red y estoy listo para responder tus preguntas.",
        })

    # Append the user's actual message
    session.messages.append({"role": "user", "content": request.message})

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=CHAT_SYSTEM_PROMPT,
            messages=session.messages,
        )
        reply = response.content[0].text
    except anthropic.APIStatusError as exc:
        logger.error("Anthropic API error: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc.message}")
    except Exception as exc:
        logger.error("Unexpected error in chat endpoint: %s", exc)
        raise HTTPException(
            status_code=500, detail="Internal error contacting AI service"
        )

    # Persist assistant reply in session history
    session.messages.append({"role": "assistant", "content": reply})

    return ChatResponseSchema(content=reply, session_id=session_id)
