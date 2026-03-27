# Spec: backend/agents — Modern Async APIs & DRY

**Status**: Active
**Last updated**: 2026-03-27 (from bugfix-code-review)

---

## Requirement: Thread Executor Without Deprecated Loop Access

Code that offloads synchronous blocking work to a thread pool MUST use `asyncio.to_thread()`.
`asyncio.get_event_loop()` MUST NOT be used in any async context.

### Scenario: Netmiko SSH push (happy path)
- GIVEN `dry_run=False` and a suggestion with SSH credentials
- WHEN `_push_via_netmiko` is invoked
- THEN the blocking Netmiko call MUST run in a thread via `asyncio.to_thread()`
- AND the calling coroutine MUST await the result without blocking the event loop

### Scenario: Netmiko not installed
- GIVEN netmiko is not installed in the environment
- WHEN `_push_via_netmiko` is invoked
- THEN it MUST return `{"success": False, "error": "netmiko not installed"}`

---

## Requirement: Shared JSON Extraction Utility

Both AnalystAgent and ConfigAgent MUST use a single shared function `extract_json_from_llm_response()` located in `backend/utils/json_utils.py`.
Duplication of JSON parsing logic across agents MUST NOT exist.

### Scenario: Claude responds with markdown fenced JSON
- GIVEN Claude returns ` ```json\n{...}\n``` `
- WHEN `extract_json_from_llm_response()` is called
- THEN the fence markers MUST be stripped and the inner JSON parsed correctly

### Scenario: Claude responds with free-text containing JSON
- GIVEN Claude returns narrative text with a JSON object embedded in it
- WHEN `extract_json_from_llm_response()` is called
- THEN the function MUST locate the outermost `{...}` and parse it
- AND if no valid JSON dict is found, MUST return a safe fallback dict with `"error"` key

---

## Requirement: Timezone-Aware Datetimes in Agents

All `datetime` usage in agent code MUST use `datetime.now(timezone.utc)`.
`datetime.utcnow()` MUST NOT appear in agent or orchestrator code.
