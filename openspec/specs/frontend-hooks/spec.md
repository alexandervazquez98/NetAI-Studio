# Spec: frontend/hooks — WebSocket Reliability & Type Safety

**Status**: Active
**Last updated**: 2026-03-27 (from bugfix-code-review)

---

## Requirement: Exponential Backoff on WebSocket Reconnect

The WebSocket hook MUST implement exponential backoff when reconnecting after disconnection.
Delay formula: `min(1000 * 2^attempt, 30000)` milliseconds.
The attempt counter MUST reset to zero upon a successful connection open (`ws.onopen`).

### Scenario: First reconnect after disconnect
- GIVEN the WebSocket disconnects (ws.onclose fires)
- WHEN the first reconnect attempt is scheduled
- THEN the delay MUST be 1000ms (2^0 * 1000)

### Scenario: Repeated reconnects (backend down)
- GIVEN N consecutive disconnects with no successful open
- WHEN the Nth reconnect fires
- THEN the delay MUST be min(1000 * 2^(N-1), 30000)

### Scenario: Successful reconnect resets counter
- GIVEN prior failed reconnect attempts
- WHEN the WebSocket opens successfully
- THEN the attempt counter MUST reset to 0

---

## Requirement: Analysis Complete Handler

The `analysis_complete` WebSocket message MUST trigger a REST fetch to `/api/analysis/{id}`.
`setAlerts` and `setSuggestions` MUST be called with the fetched data.
The handler MUST gracefully handle fetch errors without crashing.

### Scenario: analysis_complete message received
- GIVEN an `analysis_complete` WS message with `analysis_id`
- WHEN the message handler processes it
- THEN a GET request MUST be made to `/api/analysis/{analysis_id}`
- AND `setAlerts` MUST be called with `response.alerts`
- AND `setSuggestions` MUST be called with `response.raw_result.suggestions`
- AND errors MUST be caught and logged, not thrown

---

## Requirement: Type-Safe parentNode Access

`(n as any).parentNode` MUST NOT appear in `useGraphStore.ts`.
The `parentNode` field on ReactFlow `Node` type MUST be accessed directly.

### Scenario: Removing a site group node
- GIVEN a ReactFlow `Node` with type `siteGroup`
- WHEN child nodes are filtered by `parentNode`
- THEN `n.parentNode` MUST be used directly (with nullish coalesce where needed)
