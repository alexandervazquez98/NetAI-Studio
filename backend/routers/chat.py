import json
import logging

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

CHAT_SYSTEM_PROMPT = """Eres el asistente de red de una organización. Tienes acceso al estado actual de la red
a través del contexto que se te proporciona. Responde en lenguaje natural y claro,
sin jerga innecesaria cuando hablas con el usuario. Cuando se te pregunten cosas técnicas,
puedes usar terminología de redes pero siempre explicando el impacto en negocio.

Limitaciones que debes conocer:
- Sedes F y G tienen visibilidad limitada (SD-WAN de terceros).
- Solo puedes sugerir cambios de configuración; no los ejecutas directamente.
- Si el usuario quiere aplicar un cambio, dile que use el botón "Aprobar" en la tarjeta de sugerencias."""


async def _build_context(db: AsyncSession) -> str:
    """Build a textual context string from the current DB state."""
    # Topology
    sites = (await db.execute(select(Site))).scalars().all()
    nodes = (await db.execute(select(NetworkNode))).scalars().all()
    edges = (await db.execute(select(NetworkEdge))).scalars().all()
    topology = build_network_graph_json(sites, nodes, edges)

    # Last completed analysis
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


@router.post("/", response_model=ChatResponseSchema)
async def chat(
    request: ChatRequestSchema,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle a chat message from the user.
    Fetches current topology + last analysis, then calls Claude for a response.
    """
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail="Anthropic API key not configured. Set ANTHROPIC_API_KEY.",
        )

    try:
        context = await _build_context(db)
    except Exception as exc:
        logger.warning("Failed to build chat context: %s", exc)
        context = "No hay contexto de red disponible en este momento."

    user_content = f"{context}\n\n=== PREGUNTA DEL USUARIO ===\n{request.message}"

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            system=CHAT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
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

    return ChatResponseSchema(content=reply)
