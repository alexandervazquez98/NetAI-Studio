# Archive: bugfix-code-review

**Archived**: 2026-03-27
**Branch**: fix/p0-p1-code-review-bugs
**PR**: #4 (https://github.com/alexandervazquez98/NetAI-Studio/pull/4)
**Issue**: #3 (https://github.com/alexandervazquez98/NetAI-Studio/issues/3)

## Engram Artifact Index

| Artifact | Observation ID |
|----------|---------------|
| proposal | #223 |
| state | #224 |
| spec | #225 |
| design | #226 |
| tasks | #227 |
| apply-progress | #228 |
| verify-report | #229 |

## Verification Verdict

**PASS WITH WARNINGS**

- pytest: 153/153 passed
- tsc --noEmit: 0 errors
- Compliance: 19/24 spec scenarios (5 gaps = frontend Vitest not runnable in CI local)
- No CRITICAL issues

## Commits

1. `refactor: replace deprecated datetime.utcnow + extract json_utils`
2. `fix: backend P0/P1 bug fixes`
3. `fix(frontend): WS exponential backoff + analysis_complete handler + type safety`
4. `test: update and add tests for all P0/P1 fixes`

## Files Changed

| File | Change |
|------|--------|
| `backend/utils/json_utils.py` | Created — shared JSON extraction utility |
| `backend/models/analysis.py` | Timezone-aware datetime columns |
| `backend/models/schemas.py` | Timezone-aware default + session_id in chat schemas |
| `backend/agents/analyst_agent.py` | Removed duplicated _extract_json |
| `backend/agents/config_agent.py` | Removed _parse_json_response; asyncio.to_thread |
| `backend/agents/orchestrator.py` | Fix utcnow() |
| `backend/routers/chat.py` | In-memory session store with TTL |
| `mcp-server/server.py` | Transport streamable_http |
| `frontend/src/hooks/useWebSocket.ts` | Exponential backoff + analysis_complete handler |
| `frontend/src/hooks/useGraphStore.ts` | Remove (n as any).parentNode |
| `backend/tests/test_agents.py` | Updated to json_utils; added to_thread test |
| `backend/tests/test_schemas.py` | Fixed utcnow; session_id tests |
| `backend/tests/test_routers.py` | Session history tests |
| `backend/tests/test_utils.py` | TestJsonUtils class |

## Open Warnings (P2 Backlog)

1. Vitest tests for useWebSocket backoff scenarios
2. Pydantic v2 `class Config` → `model_config = ConfigDict(...)` migration
3. Redis-backed session store for cross-restart persistence
