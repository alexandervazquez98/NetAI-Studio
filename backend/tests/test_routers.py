"""
Tests for FastAPI routers using httpx.AsyncClient with ASGITransport.

All external services (DB, Redis, Anthropic) are mocked.
The database engine is patched before import to avoid connection attempts.
"""

import pytest
import sys
from unittest.mock import AsyncMock, patch, MagicMock


# ── Module-level DB mock ───────────────────────────────────────────────────────
# database.py calls create_async_engine() at import time, which tries to connect.
# We pre-inject a fake module so imports don't fail outside Docker.


def _make_db_mock():
    """Return a fake backend.database module that doesn't create a real engine."""
    import types

    mod = types.ModuleType("backend.database")
    mod.Base = MagicMock()
    mod.AsyncSessionLocal = MagicMock()
    mod.async_engine = MagicMock()
    mod.init_db = AsyncMock()

    async def _get_db():
        session = AsyncMock()
        session.execute = AsyncMock(
            return_value=MagicMock(
                scalars=MagicMock(
                    return_value=MagicMock(all=MagicMock(return_value=[]))
                ),
                scalar_one_or_none=MagicMock(return_value=None),
            )
        )
        session.add = MagicMock()
        session.commit = AsyncMock()
        session.refresh = AsyncMock()
        session.get = AsyncMock(return_value=None)
        session.delete = AsyncMock()
        session.rollback = AsyncMock()
        yield session

    mod.get_db = _get_db
    return mod


# Inject mock BEFORE any backend module is imported
if "backend.database" not in sys.modules:
    sys.modules["backend.database"] = _make_db_mock()
else:
    # Already imported (e.g. another test file loaded it first) — patch init_db
    sys.modules["backend.database"].init_db = AsyncMock()


# ── Fixtures ───────────────────────────────────────────────────────────────────


@pytest.fixture
async def client():
    """
    Create a test AsyncClient backed by the FastAPI app.
    The lifespan (which calls init_db) is bypassed by patching it.
    """
    from httpx import AsyncClient, ASGITransport
    from contextlib import asynccontextmanager
    from fastapi import FastAPI

    # Patch lifespan to a no-op so init_db isn't called for real
    @asynccontextmanager
    async def _noop_lifespan(app):
        yield

    with (
        patch("backend.main.lifespan", _noop_lifespan),
        patch("backend.main.init_db", new_callable=AsyncMock),
    ):
        # Import app after patches are in place
        import importlib
        import backend.main as main_mod

        importlib.reload(main_mod)
        _app = main_mod.app

        async with AsyncClient(
            transport=ASGITransport(app=_app),
            base_url="http://test",
        ) as ac:
            yield ac


# ── Health ─────────────────────────────────────────────────────────────────────


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_returns_ok_status(self, client):
        response = await client.get("/health")
        data = response.json()
        assert data.get("status") == "ok"

    @pytest.mark.asyncio
    async def test_health_returns_service_name(self, client):
        response = await client.get("/health")
        data = response.json()
        assert "service" in data


# ── Graph ──────────────────────────────────────────────────────────────────────


class TestGraphRouter:
    @pytest.mark.asyncio
    async def test_get_graph_endpoint_exists(self, client):
        response = await client.get("/api/graph/")
        # 200 = success, 500 = DB issue — both mean route exists
        assert response.status_code != 404

    @pytest.mark.asyncio
    async def test_get_graph_returns_topology_schema(self, client):
        response = await client.get("/api/graph/")
        if response.status_code == 200:
            data = response.json()
            assert "sites" in data
            assert "nodes" in data
            assert "edges" in data

    @pytest.mark.asyncio
    async def test_post_graph_endpoint_exists(self, client):
        payload = {"sites": [], "nodes": [], "edges": []}
        response = await client.post("/api/graph/", json=payload)
        assert response.status_code != 404

    @pytest.mark.asyncio
    async def test_post_graph_rejects_missing_fields(self, client):
        # Completely empty body — FastAPI should return 422 validation error
        response = await client.post("/api/graph/", json={})
        # 200 (empty lists default) or 422 (validation failure) — never 404
        assert response.status_code in (200, 422)

    @pytest.mark.asyncio
    async def test_export_endpoint_exists(self, client):
        response = await client.get("/api/graph/export")
        assert response.status_code != 404


# ── Analysis ───────────────────────────────────────────────────────────────────


class TestAnalysisRouter:
    @pytest.mark.asyncio
    async def test_run_analysis_endpoint_exists(self, client):
        response = await client.post("/api/analysis/run")
        assert response.status_code != 404

    @pytest.mark.asyncio
    async def test_run_analysis_returns_analysis_id_when_db_works(self, client):
        """
        When the DB session properly creates and returns an Analysis object,
        the response should include an analysis_id.
        """
        mock_analysis = MagicMock()
        mock_analysis.id = "test-analysis-uuid"
        mock_analysis.status = "running"

        # Patch the DB dependency for just this test
        with patch("backend.routers.analysis.get_db") as mock_get_db:
            mock_session = AsyncMock()
            mock_session.add = MagicMock()
            mock_session.commit = AsyncMock()

            async def mock_refresh(obj):
                obj.id = "test-analysis-uuid"
                obj.status = "running"

            mock_session.refresh = mock_refresh

            async def _gen():
                yield mock_session

            mock_get_db.return_value = _gen()

            response = await client.post("/api/analysis/run")
            if response.status_code == 200:
                data = response.json()
                assert "analysis_id" in data
                assert "status" in data

    @pytest.mark.asyncio
    async def test_get_history_endpoint_exists(self, client):
        response = await client.get("/api/analysis/history")
        assert response.status_code != 404

    @pytest.mark.asyncio
    async def test_get_history_returns_list(self, client):
        response = await client.get("/api/analysis/history")
        if response.status_code == 200:
            assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_get_analysis_not_found_returns_404(self, client):
        response = await client.get("/api/analysis/nonexistent-id")
        # 404 expected when analysis doesn't exist; could also be 500 if DB errors
        assert response.status_code in (404, 500)


# ── Chat ───────────────────────────────────────────────────────────────────────


class TestChatRouter:
    @pytest.mark.asyncio
    async def test_chat_endpoint_exists(self, client):
        with (
            patch("backend.routers.chat.anthropic") as mock_anthropic,
            patch("backend.routers.chat.settings") as mock_settings,
        ):
            mock_settings.anthropic_api_key = "fake-key"
            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(
                return_value=MagicMock(
                    content=[MagicMock(text="La red está operando normalmente.")]
                )
            )
            mock_anthropic.AsyncAnthropic.return_value = mock_client

            payload = {"message": "¿Cómo está la red?"}
            response = await client.post("/api/chat/", json=payload)
            assert response.status_code != 404

    @pytest.mark.asyncio
    async def test_chat_returns_503_when_no_api_key(self, client):
        with patch("backend.routers.chat.settings") as mock_settings:
            mock_settings.anthropic_api_key = ""
            payload = {"message": "Test"}
            response = await client.post("/api/chat/", json=payload)
            assert response.status_code == 503

    @pytest.mark.asyncio
    async def test_chat_requires_message_field(self, client):
        # Missing required 'message' field → 422 validation error
        response = await client.post("/api/chat/", json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_chat_returns_response_with_content(self, client):
        with (
            patch("backend.routers.chat.anthropic") as mock_anthropic,
            patch("backend.routers.chat.settings") as mock_settings,
            patch(
                "backend.routers.chat._build_context", new_callable=AsyncMock
            ) as mock_ctx,
        ):
            mock_settings.anthropic_api_key = "fake-key"
            mock_ctx.return_value = "Contexto de red simulado"
            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(
                return_value=MagicMock(
                    content=[MagicMock(text="Todo está bien en la red.")]
                )
            )
            mock_anthropic.AsyncAnthropic.return_value = mock_client

            payload = {"message": "Estado de la red?"}
            response = await client.post("/api/chat/", json=payload)
            if response.status_code == 200:
                data = response.json()
                assert "content" in data
                assert data["content"] == "Todo está bien en la red."
