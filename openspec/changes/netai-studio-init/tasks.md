# Tasks: NetAI Studio Initialization

## Phase 1: Foundation & Infrastructure

- [ ] 1.1 Create `docker-compose.yml` defining services: `postgres`, `redis`, `backend`, `frontend`.
- [ ] 1.2 Initialize backend Python project: Create `backend/requirements.txt` with FastAPI, SQLAlchemy, asyncpg, redis, uvicorn, pydantic.
- [x] 1.3 Create `backend/main.py` to bootstrap the FastAPI application.
- [ ] 1.4 Initialize frontend React project: Run Vite/Create React App in `frontend/` directory (installing `react`, `reactflow`, `lucide-react`, `tailwindcss`).
- [ ] 1.5 Set up TailwindCSS in the `frontend/` directory (configure `tailwind.config.js` and `index.css`).

## Phase 2: Data Models & Database

- [x] 2.1 Create `backend/models/database.py` and configure SQLAlchemy async engine.
- [x] 2.2 Define SQLAlchemy models in `backend/models/schema.py` for `Site`, `Node`, `Link`, and `AgentTask`.
- [ ] 2.3 Set up Alembic for database migrations in `backend/alembic/` and create initial migration for the schema.
- [x] 2.4 Create `backend/services/redis_client.py` for Redis connection management and pub/sub utilities.

## Phase 3: Backend Agents & MCP Server

- [ ] 3.1 Create `backend/agents/orchestrator.py` to manage agent tasks and state.
- [ ] 3.2 Create `backend/agents/topology.py` (Topology Subagent) to simulate or discover the 70 nodes.
- [ ] 3.3 Create `backend/agents/metrics.py` (Metrics Subagent) with logic to poll Aviat WAN gateways.
- [ ] 3.4 Create `backend/agents/config.py` (Config Subagent) ensuring it is strictly constrained to dry-run logic.
- [ ] 3.5 Create `backend/agents/analyst.py` (Analyst Subagent) to publish reasoning logs to Redis.
- [x] 3.6 Create `backend/mcp_server/server.py` to expose network state read-tools via MCP for Claude.

## Phase 4: API & WebSockets

- [x] 4.1 Create `backend/api/routes/topology.py` for REST endpoints to fetch sites, nodes, and links.
- [ ] 4.2 Create `backend/api/routes/config.py` exposing `POST /api/v1/config/dry-run` to trigger the Config Subagent.
- [x] 4.3 Create `backend/api/websockets.py` establishing the `/ws/logs` endpoint for streaming AI reasoning logs.
- [x] 4.4 Create `backend/api/websockets.py` establishing the `/ws/topology` endpoint for live topology updates.
- [x] 4.5 Wire all routers into `backend/main.py`.

## Phase 5: Frontend UI & Integration

- [ ] 5.1 Update `frontend/src/App.tsx` to define the 3-panel layout (Graph Builder, AI Reasoning Panel, Insights & Chat).
- [ ] 5.2 Create `frontend/src/components/GraphBuilder.tsx` integrating `ReactFlow` to fetch and display the topology from the backend.
- [ ] 5.3 Create `frontend/src/components/AIReasoningPanel.tsx` connecting to `/ws/logs` to render streaming logs.
- [ ] 5.4 Create `frontend/src/components/InsightsChat.tsx` to interface with the Analyst Subagent.
- [ ] 5.5 Create `frontend/src/components/ConfigPanel.tsx` to test the dry-run configuration API.

## Phase 6: Testing & Polish

- [ ] 6.1 Write unit tests in `backend/tests/test_config_agent.py` asserting the dry-run constraint cannot be bypassed.
- [ ] 6.2 Write unit tests in `backend/tests/test_api_routes.py` for the REST endpoints.
- [ ] 6.3 Verify WebSocket connection stability and auto-reconnection logic in the frontend components.
- [ ] 6.4 Update `README.md` with instructions to run `docker-compose up -d` and access the NetAI Studio UI.
