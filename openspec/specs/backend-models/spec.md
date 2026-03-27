# Spec: backend/models — Timezone-Aware Datetimes

**Status**: Active
**Last updated**: 2026-03-27 (from bugfix-code-review)

---

## Requirement: Timezone-Aware Timestamps

All datetime values stored in the database MUST be timezone-aware.
Column definitions MUST use `DateTime(timezone=True)`.
Default values MUST use `lambda: datetime.now(timezone.utc)` — never `datetime.utcnow`.

### Scenario: Analysis record creation
- GIVEN the orchestrator creates a new Analysis row
- WHEN it is persisted to PostgreSQL
- THEN `created_at` MUST carry UTC timezone info (not naive datetime)

### Scenario: LogEntry record creation
- GIVEN an agent logs a pipeline event
- WHEN the LogEntry row is inserted
- THEN `created_at` MUST carry UTC timezone info

### Scenario: Schema default
- GIVEN `LogEntrySchema` is instantiated without an explicit `created_at`
- WHEN the default factory runs
- THEN the returned datetime MUST be timezone-aware

---

## Requirement: Session ID in Chat Contract

`ChatRequestSchema` MUST accept an optional `session_id: Optional[str] = None`.
`ChatResponseSchema` MUST always return a `session_id: str`.
