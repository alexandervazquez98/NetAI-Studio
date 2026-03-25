# NetAI Studio

An AI-powered network management platform that combines a visual graph builder, multi-agent AI reasoning, and an interactive insights/chat interface to monitor and manage a 7-site enterprise WAN.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Development Setup](#development-setup)
6. [Running Tests](#running-tests)
7. [Testing Protocol](#testing-protocol)
8. [Environment Variables](#environment-variables)
9. [Network Architecture](#network-architecture)
10. [MCP Tools Reference](#mcp-tools-reference)
11. [SD-WAN Limitations](#sd-wan-limitations)
12. [Config Agent Safety](#config-agent-safety)

---

## Project Overview

NetAI Studio has three screens:

| Screen | Route | Description |
|--------|-------|-------------|
| **Graph Builder** | `/` | Visual ReactFlow canvas for building and editing the network topology. Drag-and-drop nodes from a palette, connect them with typed edges, and save the topology to the backend. |
| **AI Reasoning** | `/reasoning` | Live view of the 5-agent orchestration pipeline (Topology, Metrics, Analyst, Config, Orchestrator). Watch agent states update in real time over WebSocket as an analysis runs. Includes analysis history. |
| **Insights** | `/insights` | Alert dashboard combined with an AI chat interface. Ask the orchestrator questions about the network in natural language and get context-aware responses. |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│  ┌────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   Graph    │  │   AI Reasoning   │  │    Insights &    │   │
│  │  Builder   │  │      Panel       │  │      Chat        │   │
│  └─────┬──────┘  └────────┬─────────┘  └────────┬─────────┘   │
│        │ REST             │ WebSocket            │ REST         │
└────────┼──────────────────┼──────────────────────┼─────────────┘
         │                  │                      │
         ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (:8000)                       │
│                                                                 │
│  /api/graph/*   /api/analysis/*   /api/chat/*   /ws/analysis   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Orchestrator Agent                          │  │
│  │  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │ Topology  │ │ Metrics  │ │ Analyst  │ │  Config  │  │  │
│  │  │   Agent   │ │  Agent   │ │  Agent   │ │  Agent   │  │  │
│  │  └─────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │  │
│  └────────┼────────────┼────────────┼─────────────┼────────┘  │
│           │            │            │             │            │
│           └────────────┴─────┬──────┴─────────────┘            │
│                              │ HTTP                             │
│                    ┌─────────▼──────────┐                      │
│                    │   MCP Server        │                      │
│                    │     (:8001)         │                      │
│                    │  get_topology       │                      │
│                    │  get_wan_metrics    │                      │
│                    │  get_anomalies      │                      │
│                    │  push_config        │                      │
│                    └────────────────────┘                      │
│                                                                 │
│  ┌────────────────┐          ┌───────────────────┐             │
│  │  PostgreSQL    │          │      Redis         │             │
│  │  (topology,    │          │  (pub/sub, cache,  │             │
│  │   analyses)    │          │   agent state)     │             │
│  └────────────────┘          └───────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Docker | 24+ | Required for `docker-compose up` |
| Docker Compose | v2 | Bundled with Docker Desktop |
| Node.js | 20+ | For local frontend development |
| Python | 3.11+ | For local backend development |
| Anthropic API Key | — | `claude-sonnet-4-6` model access required |

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url>
cd "NetAI Studio"

# 2. Configure environment variables
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY

# 3. Build and start all services
docker-compose up --build

# 4. Open the app
#    Frontend:   http://localhost:3000
#    Backend API: http://localhost:8000/docs
#    MCP Server: http://localhost:8001
```

---

## Development Setup

Run the frontend and backend separately for faster iteration:

### Frontend

```bash
cd frontend
npm install
npm run dev
# Vite dev server at http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Requires PostgreSQL and Redis running (use docker-compose for infra only)
docker-compose up postgres redis -d

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### MCP Server

```bash
cd mcp-server
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

---

## Running Tests

| Layer | Command | Location | Notes |
|-------|---------|----------|-------|
| Frontend unit | `npm run test` | `frontend/` | Vitest + React Testing Library; 28 tests |
| Frontend coverage | `npm run test:coverage` | `frontend/` | V8 coverage report |
| Frontend E2E | `npm run test:e2e` | `frontend/` | Playwright; requires dev server or starts it automatically |
| Backend unit | `pytest` | `backend/` | 134 tests; no Docker needed |
| Backend coverage | `pytest --cov=. --cov-report=term-missing` | `backend/` | |
| Type check (app) | `npx tsc --noEmit` | `frontend/` | Main app TypeScript |
| Type check (e2e) | `npx tsc --project tsconfig.e2e.json --noEmit` | `frontend/` | Playwright spec files |

### E2E notes

- All API calls are mocked with `page.route()` — no real backend is required to run the E2E tests.
- The Playwright config auto-starts `npm run dev` when `CI` is not set (`reuseExistingServer: !process.env.CI`).
- On CI, set `CI=true` and ensure the dev server is started externally before running `npm run test:e2e`.
- Artifacts (screenshots, videos) are retained on failure at `frontend/test-results/`.

---

## Testing Protocol

**Every feature or change must pass all applicable test layers before it is considered complete and ready to merge.**

| Test layer | Applies to | Gate |
|------------|-----------|------|
| TypeScript (`tsc --noEmit`) | Any frontend change | No type errors |
| Frontend unit (Vitest) | Components, hooks, stores | All tests green |
| Backend unit (pytest) | Agents, routers, models | All tests green |
| E2E (Playwright) | User-visible behaviour | All specs pass |

Skipping a layer requires an explicit justification in the PR. Silent omissions are not acceptable.

---

## Environment Variables

All variables are defined in `.env.example`. Copy it to `.env` before starting.

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | _(required)_ | API key for the Anthropic Claude API. Used by all agents. |
| `POSTGRES_DB` | `netai` | PostgreSQL database name. |
| `POSTGRES_USER` | `netai` | PostgreSQL username. |
| `POSTGRES_PASSWORD` | `changeme` | PostgreSQL password. Change in production. |
| `POSTGRES_HOST` | `postgres` | Hostname for PostgreSQL (Docker service name). |
| `POSTGRES_PORT` | `5432` | PostgreSQL port. |
| `REDIS_HOST` | `redis` | Hostname for Redis (Docker service name). |
| `REDIS_PORT` | `6379` | Redis port. |
| `BACKEND_HOST` | `0.0.0.0` | FastAPI bind address. |
| `BACKEND_PORT` | `8000` | FastAPI port. |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins (comma-separated). |
| `MCP_SERVER_HOST` | `mcp-server` | MCP server hostname. |
| `MCP_SERVER_PORT` | `8001` | MCP server port. |
| `ANALYSIS_INTERVAL_MINUTES` | `15` | How often to run automatic analyses (if enabled). |
| `ANALYSIS_ENABLED` | `false` | Set to `true` to enable the scheduled analysis cron. |
| `CONFIG_AGENT_DRY_RUN_DEFAULT` | `true` | If `true`, `push_config` always previews commands without applying them. |
| `CONFIG_AGENT_REQUIRE_APPROVAL` | `true` | If `true`, live config pushes are blocked until explicitly approved. |

---

## Network Architecture

The system is designed around a **7-site enterprise WAN**:

| Site | Role | WAN Type | Observability |
|------|------|----------|---------------|
| A (HQ) | Hub / Data Centre | MPLS + Aviat | Full — direct API access |
| B | Branch | MPLS + Aviat | Full — direct API access |
| C | Branch | MPLS + Aviat | Full — direct API access |
| D | Branch | MPLS + Aviat | Full — direct API access |
| E | Branch | MPLS + Aviat | Full — direct API access |
| F | Remote branch | SD-WAN (third party) | Partial — inferred from SW-EXT uplink counters only |
| G | Remote branch | SD-WAN (third party) | Partial — inferred from SW-EXT uplink counters only |

Sites A–E have direct Aviat CTR API access and full metric observability. Sites F and G are connected through a third-party managed SD-WAN; their internal CPE and WAN metrics are not directly accessible.

---

## MCP Tools Reference

The MCP server exposes four tools that the AI agents call via the Model Context Protocol:

| Tool | Signature | Description |
|------|-----------|-------------|
| `get_topology_context` | `(scope, target?, include_metrics?, max_nodes?)` | Returns the network graph filtered by scope: `full_summary`, `site`, `node_neighbors`, or `path`. Caps results at `max_nodes` to avoid context overflow. |
| `get_wan_link_metrics` | `(site_id)` | Returns WAN link metrics for a site. MPLS/Aviat sites return live data from the Aviat REST API (with DB fallback). SD-WAN sites return inferred counters with explicit `observable: false`. Never invents metrics. |
| `get_anomalies` | `(severity?)` | Detects active anomalies across the topology: WAN congestion (>80% / >95%), Aviat signal degradation (<−70 dBm), CPU spikes (>70%), interface-down events, and single-path WAN (no redundancy). Filterable by severity: `critical`, `warning`, `info`, `all`. |
| `push_config` | `(host, config[], dry_run?)` | Applies configuration commands to a network device via SSH (Netmiko). **Defaults to `dry_run=true`** — always previews before applying. Live execution requires `CONFIG_AGENT_REQUIRE_APPROVAL=false`. |

---

## SD-WAN Limitations

> **Important:** Sites F and G are managed by a third-party SD-WAN provider. NetAI Studio has **no direct API access** to the SD-WAN CPE at these sites.

The following metrics are **not available** for SD-WAN sites:

- `tunnel_state`
- `wan_latency_ms`
- `path_selection`
- `signal_dbm`
- `availability_30d`
- `cpe_health`

The `get_wan_link_metrics` tool returns `observable: false` for these sites and provides only metrics inferred from the SW-EXT (external core switch) uplink counters. The Analyst Agent is instructed to clearly communicate these limitations in its reports rather than inventing values.

---

## Config Agent Safety

> **The Config Agent operates in dry-run mode by default and will never apply configuration changes without explicit approval.**

Two environment variables control this behaviour:

| Variable | Default | Effect |
|----------|---------|--------|
| `CONFIG_AGENT_DRY_RUN_DEFAULT` | `true` | The `push_config` tool always returns a preview of commands without executing them. |
| `CONFIG_AGENT_REQUIRE_APPROVAL` | `true` | Even when `dry_run=false` is passed, live execution is blocked unless this is set to `false`. |

**To allow live configuration pushes** (e.g. in a lab environment):

```bash
CONFIG_AGENT_DRY_RUN_DEFAULT=false
CONFIG_AGENT_REQUIRE_APPROVAL=false
```

This dual-gate design ensures that a misconfigured agent or prompt injection cannot push unintended changes to production devices.
