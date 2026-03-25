# Design: NetAI Studio Initialization

## Technical Approach

The NetAI Studio system will be a fully containerized, microservices-based application. It uses a FastAPI backend acting as the Orchestrator for various network subagents (Topology, Metrics, Analyst, Config). These agents interface with a local PostgreSQL database for persistent state and Redis for caching and WebSocket pub/sub. The frontend is built in React, utilizing ReactFlow for interactive network topology visualization, and WebSockets to stream real-time reasoning logs from the AI Analyst agent. An MCP Server exposes network context to Claude for advanced reasoning.

## Architecture Decisions

### Decision: Backend Framework

**Choice**: FastAPI (Python)
**Alternatives considered**: Express.js (Node), Spring Boot (Java), Flask
**Rationale**: Python is the lingua franca for network automation (Netmiko, Nornir, NAPALM) and AI integrations (LangChain, OpenAI, Anthropic SDKs). FastAPI provides high-performance asynchronous execution, automatic OpenAPI documentation, and seamless WebSocket support needed for our streaming requirements.

### Decision: State Management & Real-time Pub/Sub

**Choice**: Redis
**Alternatives considered**: RabbitMQ, Kafka, Postgres LISTEN/NOTIFY
**Rationale**: Redis is lightweight, easy to containerize, and perfectly suited for fast ephemeral state (caching metrics) and pub/sub capabilities to stream AI reasoning logs to the WebSockets without overwhelming the primary database.

### Decision: Primary Datastore

**Choice**: PostgreSQL
**Alternatives considered**: MongoDB, SQLite, Neo4j
**Rationale**: Relational data models fit well for network inventory (Sites, Nodes, Credentials, Edges). Postgres offers robust JSONB support for unstructured metric data and agent state, and handles concurrent reads/writes well in a containerized environment. While Neo4j is great for graphs, Postgres is sufficient for ~70 nodes and simplifies the stack.

### Decision: Topology Visualization

**Choice**: ReactFlow
**Alternatives considered**: D3.js, Cytoscape.js, vis.js
**Rationale**: ReactFlow provides out-of-the-box support for interactive, node-based UIs with a clean React-native API. It easily supports custom node types (e.g., distinguishing Cisco vs Aviat nodes, or SD-WAN black-box representations) and seamless state synchronization.

### Decision: AI Integration Strategy

**Choice**: Model Context Protocol (MCP) Server
**Alternatives considered**: Direct API calls from Backend to Claude
**Rationale**: Using an MCP server standardizes how the AI agents access network data, topological states, and metrics. It decouples the core network data extraction from the AI prompting logic, allowing Claude to safely explore read-only tools.

## Data Flow

```ascii
  [React Frontend] (Graph Builder, AI Reasoning, Insights)
       │       │
  (REST)       (WebSockets)
       │       │
       ▼       ▼
    [FastAPI Backend / Orchestrator] ────► [MCP Server] ────► [Claude API]
       │       │         │
       │    (Pub/Sub)    │
       │       │         │
       ▼       ▼         ▼
  [Postgres] [Redis]  [Subagents: Topology, Metrics, Analyst, Config]
                         │
                         ▼
                   [Enterprise Network (7 Sites, ~70 Nodes)]
                   (Cisco, Aviat, SD-WAN)
```

1. **Topology Discovery**: The Topology Subagent polls network nodes, saving state to Postgres.
2. **Metrics Collection**: The Metrics Subagent polls node health (prioritizing Aviat WAN gateways).
3. **AI Reasoning**: The Analyst Subagent receives a query, requests data via MCP, and publishes its reasoning steps to Redis.
4. **Real-time Streaming**: FastAPI consumes Redis pub/sub messages and pushes them via WebSockets to the React frontend.
5. **Configuration**: Config Subagent generates configurations (dry-run only), saving the proposed diff to Postgres for user review.

## Data Models

**Site Model**
- `id`: UUID
- `name`: String
- `type`: Enum (MPLS, SD-WAN)

**Node Model**
- `id`: UUID
- `site_id`: UUID
- `hostname`: String
- `ip_address`: String
- `vendor`: Enum (Cisco, Aviat, Unknown)
- `role`: Enum (WAN_Gateway, Core, Access, SDWAN_Edge)

**Link Model**
- `id`: UUID
- `source_node_id`: UUID
- `target_node_id`: UUID
- `status`: Enum (Up, Down)

**Agent Task Model**
- `id`: UUID
- `agent_type`: Enum (Topology, Metrics, Analyst, Config)
- `status`: Enum (Pending, Running, Completed, Failed)
- `logs`: JSONB

## WebSocket Protocols

**Channel: `ai-reasoning-logs`**
- **Direction**: Server -> Client
- **Payload**:
  ```json
  {
    "type": "log_chunk",
    "agent": "Analyst",
    "timestamp": "2023-10-01T12:00:00Z",
    "content": "Analyzing routing table on Aviat-GW-Site1..."
  }
  ```

**Channel: `topology-updates`**
- **Direction**: Server -> Client
- **Payload**:
  ```json
  {
    "type": "node_status_change",
    "node_id": "uuid",
    "new_status": "down"
  }
  ```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `docker-compose.yml` | Create | Defines Postgres, Redis, Backend, Frontend, MCP Server services. |
| `backend/main.py` | Create | FastAPI application entrypoint, mounting REST routers and WebSocket endpoints. |
| `backend/agents/orchestrator.py` | Create | Core agent router and state manager. |
| `backend/agents/config.py` | Create | Configuration agent with enforced dry-run logic. |
| `backend/mcp_server/server.py` | Create | Python-based MCP server exposing network state read-tools to Claude. |
| `backend/models/database.py` | Create | SQLAlchemy ORM models (Site, Node, Link, AgentTask). |
| `frontend/src/App.tsx` | Create | React entry point containing the 3 main screen layouts. |
| `frontend/src/components/GraphBuilder.tsx` | Create | ReactFlow implementation for topology rendering. |
| `frontend/src/components/AIReasoningPanel.tsx` | Create | WebSocket consumer and log renderer. |

## Interfaces / Contracts

### API Contract: Trigger Dry-Run Config

```http
POST /api/v1/config/dry-run
Content-Type: application/json

{
  "node_id": "uuid",
  "config_template": "ntp_server_update",
  "variables": {"ntp_ip": "10.0.0.5"}
}
```

Response:
```json
{
  "task_id": "uuid",
  "status": "pending"
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Agent pure functions, Data parsing, Config templating | Pytest with mocked network responses (netmiko mock). |
| Integration | Postgres Models, Redis Pub/Sub, FastAPI Endpoints | Pytest with testcontainers (Postgres, Redis). |
| E2E | Full application flow | Playwright (mocking backend API) + Cypress for Graph builder interactions. |

## Migration / Rollout

No migration required. This is a fresh project (alembic will be set up for future iterations). Deployment will be containerized entirely. Users run `docker-compose up -d` to spin up the entire application stack locally.

## Open Questions

- [ ] How will credentials for network devices be securely stored? (Suggest: HashiCorp Vault or encrypted in DB with a master key).
- [ ] What specific high-priority metrics should be polled from Aviat nodes? (e.g., RSSI, SNR, modulation).
