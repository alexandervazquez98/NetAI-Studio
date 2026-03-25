import asyncio
import json
import logging
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.redis_client import subscribe_channel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


class WebSocketManager:
    """Manages per-analysis WebSocket connections."""

    def __init__(self):
        # Maps analysis_id -> set of connected WebSocket clients
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, ws: WebSocket, analysis_id: str) -> None:
        await ws.accept()
        self._connections.setdefault(analysis_id, set()).add(ws)
        logger.debug(
            "WS connected for analysis %s (total: %d)",
            analysis_id,
            len(self._connections[analysis_id]),
        )

    def disconnect(self, ws: WebSocket) -> None:
        for analysis_id, clients in list(self._connections.items()):
            clients.discard(ws)
            if not clients:
                del self._connections[analysis_id]

    async def broadcast(self, analysis_id: str, message: dict) -> None:
        clients = self._connections.get(analysis_id, set())
        dead: Set[WebSocket] = set()
        for ws in list(clients):
            try:
                await ws.send_json(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            clients.discard(ws)


manager = WebSocketManager()


@router.websocket("/ws/reasoning")
async def ws_reasoning(websocket: WebSocket, analysis_id: str = ""):
    """
    WebSocket endpoint for streaming reasoning events.
    Subscribes to Redis channel `reasoning:{analysis_id}` and forwards
    all messages to the connected client.
    """
    await manager.connect(websocket, analysis_id)
    channel = f"reasoning:{analysis_id}" if analysis_id else "reasoning:global"

    async def redis_forwarder():
        async for message in subscribe_channel(channel):
            try:
                await websocket.send_json(message)
            except Exception:
                break

    forwarder_task = asyncio.create_task(redis_forwarder())

    try:
        while True:
            # Keep the connection alive; client may send pings
            data = await websocket.receive_text()
            # Optionally handle client messages (e.g., ping/pong)
    except WebSocketDisconnect:
        logger.debug("WS disconnected for analysis %s", analysis_id)
    except Exception as exc:
        logger.warning("WS error for analysis %s: %s", analysis_id, exc)
    finally:
        manager.disconnect(websocket)
        forwarder_task.cancel()
        try:
            await forwarder_task
        except asyncio.CancelledError:
            pass
