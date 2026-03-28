# Spec: backend/routers — Chat Session History

**Status**: Active
**Last updated**: 2026-03-27 (from bugfix-code-review)

---

## Requirement: Session-Scoped Conversation History

The chat endpoint MUST maintain per-session message history so Claude has turn-by-turn context.
Each session MUST be identified by an optional `session_id` string in the request body.
Sessions MUST auto-expire after 60 minutes of inactivity.
A background cleanup coroutine MUST run every 5 minutes to evict expired sessions.

### Scenario: First message in a new session
- GIVEN no `session_id` is provided in the request
- WHEN the user sends a message
- THEN a new session MUST be created with a UUID4 generated ID
- AND the response MUST include the new `session_id`

### Scenario: Follow-up message in existing session
- GIVEN a `session_id` from a prior response
- WHEN the user sends another message
- THEN Claude MUST receive the full prior message history
- AND the response MUST reflect awareness of the prior context

### Scenario: Session not found (expired or invalid)
- GIVEN an unknown or expired `session_id`
- WHEN the user sends a message
- THEN a new session MUST be created transparently
- AND the response MUST include the new `session_id` (different from the invalid one)

### Scenario: No session_id provided (backward compat)
- GIVEN a request body with only `message` (no `session_id`)
- WHEN the endpoint processes the request
- THEN it MUST function as a single-turn query
- AND the response MUST include a `session_id` for potential follow-up

---

## Requirement: MCP Server HTTP Transport

The MCP server MUST use `streamable_http` transport (not `stdio`).
Host and port MUST be configurable via `MCP_SERVER_HOST` and `MCP_SERVER_PORT` environment variables.

### Scenario: Claude invokes an MCP tool
- GIVEN the MCP server is running on HTTP
- WHEN Claude sends a tool call via HTTP
- THEN the MCP server MUST handle it via the streamable_http transport
