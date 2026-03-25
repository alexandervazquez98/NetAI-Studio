# Proposal: NetAI Studio Initialization

## Intent

Create an AI-powered network management system for a 7-site enterprise (~70 nodes, Cisco/Aviat mix, MPLS & SD-WAN) to provide AI-assisted insights, topological visibility, and automated (but safely dry-run) configuration via specialized backend subagents.

## Scope

### In Scope
- **Web Frontend**: 3 Main Screens: Graph Builder (ReactFlow), AI Reasoning Panel (WebSocket logs), and Insights & Chat.
- **Backend Architecture**: Specialized subagents including Orchestrator, Topology, Metrics, Analyst, and Config.
- **MCP Server**: Integration layer for Claude to reason over the network data.
- **Deployment**: Full Dockerized local environment for streamlined setup.
- **Site Handling**: Read-only integration with SD-WAN sites (treated as black boxes).
- **Critical Infrastructure**: High-priority monitoring for Aviat nodes (critical WAN gateways).
- **Safety Measures**: Config Agent strictly configured to dry-run by default.

### Out of Scope
- Direct, unverified configuration application to production nodes (must be explicitly approved/dry-run first).
- Deep inspection into SD-WAN internal routing (handled as black boxes).
- Cloud deployment (focusing exclusively on a local Dockerized environment first).

## Approach

Develop a full-stack, locally containerized application. The frontend will be built with React and ReactFlow for the Graph Builder, incorporating WebSockets for real-time streaming of AI reasoning logs. The backend will employ a multi-agent architecture (Orchestrator, Topology, Metrics, Analyst, Config) interfacing with an MCP Server for Claude integration. We will establish read-only metrics collection from SD-WAN edge nodes and implement targeted, high-priority polling for the critical Aviat WAN gateways. The Config Agent will be explicitly restricted to a dry-run operational mode to prevent accidental network disruptions.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/` | New | React application with ReactFlow and WebSockets |
| `backend/agents/` | New | Multi-agent backend architecture |
| `mcp-server/` | New | Claude integration layer |
| `docker/` | New | Dockerized local environment configuration |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Accidental network disruption | Low | Config Agent is strictly dry-run by default; explicit approval required. |
| SD-WAN visibility gaps | Medium | Treat SD-WAN sites as black boxes; rely on edge node metrics. |
| Aviat node metric overload | Low | Implement targeted, optimized polling specifically for WAN gateway critical nodes. |
| WebSocket connection drops | Medium | Implement auto-reconnection and state recovery in the AI Reasoning Panel. |

## Rollback Plan

For local development, rollback consists of tearing down the Docker containers and reverting code changes to the previous commit. For network operations, the Config Agent's dry-run mode ensures no actual state changes occur on the hardware unless explicitly committed. If committed changes fail or cause instability, the agent will execute a rollback to the previous backed-up running configuration.

## Dependencies

- Docker Desktop / Engine for local deployment
- React & ReactFlow libraries
- Claude API access for MCP integration
- Network access to the 7 sites (~70 nodes)

## Success Criteria

- [ ] The 3 main frontend screens (Graph Builder, AI Reasoning, Insights) render correctly and interactively.
- [ ] The Topology agent successfully discovers or maps the ~70 nodes.
- [ ] Real-time AI reasoning logs stream successfully via WebSockets to the UI.
- [ ] Config Agent executes a dry-run configuration successfully without applying changes.
- [ ] Aviat WAN gateway nodes report critical metrics consistently.
- [ ] The entire stack can be launched via a single `docker-compose up` command.
