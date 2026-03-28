# Engram Export — NetAI-Studio
Generated: 2026-03-28
Project: alexandervazquez98/NetAI-Studio
Total observations: 15 (current session) + 3 (previous sessions)

---

## SESSION SUMMARY — 2026-03-28
**Type**: session_summary

## Goal
Resolución del backlog de issues abiertos en NetAI Studio — merge del PR pendiente, fix del bug #1 (delete node) y P2 items (useWebSocket tests + Pydantic v2 migration).

## Discoveries
- ReactFlow v11 controlled mode: NUNCA llamar `setNodes()` de `useReactFlow()` cuando se usa store externo (Zustand). El prop `nodes` es la única fuente de verdad. Llamar ambos crea race condition — canvas no actualiza hasta F5.
- `PropertiesPanel` tenía su propio `handleDeleteNode` con double-write y cast `(n as any).parentNode`. El `deleteNode` del store ya era correcto.
- `git commit -m "..."` con paréntesis en cmd.exe falla — usar `git commit -F archivo.txt`.
- `gh issue create --label ""` falla — no pasar label vacío.
- `pydantic_settings` no instalado en el entorno Python local — pytest de backend no corre localmente.
- Vitest fake timers: acceder a `wsInstances[N]` ANTES de avanzar el timer que dispara el reconnect devuelve `undefined`. Siempre avanzar el timer PRIMERO.

## Accomplished
- ✅ PR #4 mergeado (fix P0/P1 bugs — issue #3 cerrado)
- ✅ SDD completo para `delete-node-reactflow`: explore→propose→spec→design→tasks→apply→verify→archive
- ✅ fix(frontend): delete node/site — PR #5 mergeado, issue #1 cerrado
- ✅ test: 5 nuevos Vitest tests para useWebSocket (backoff S1-S4 + cap)
- ✅ refactor: Pydantic v2 ConfigDict migration — 6 modelos en schemas.py
- ✅ Issue #6 levantado: feat Redis-backed session store
- ✅ PR #7 mergeado: test+refactor useWebSocket + Pydantic v2
- ✅ Test suite: 52/52 vitest passing (+10 tests respecto al inicio de sesión)

## Next Steps
- Issue #6: Redis-backed session store (reemplazar `_SESSION_STORE` in-memory)
- Smoke test visual del fix del canvas (dev server + probar botón eliminar)

## Relevant Files
- `frontend/src/components/GraphBuilder/PropertiesPanel.tsx` — fix delete node
- `frontend/src/test/components/PropertiesPanel.test.tsx` — +S7, S8 tests
- `frontend/src/test/hooks/useWebSocket.test.ts` — nuevo, 5 tests backoff+analysis_complete
- `backend/models/schemas.py` — Pydantic v2 ConfigDict migration (6 modelos)

---

## SESSION SUMMARY — 2026-03-25 (anterior)
**Type**: session_summary
**Observation**: #216

## Goal
Building NetAI Studio — AI-powered network management platform. Implementación de `aviat-edge-type` (tipo de enlace microondas) via SDD workflow.

## Instructions
- SDD workflow para todos los cambios sustanciales
- TDD: RED→GREEN cycle, escribir tests fallidos primero
- Never build after changes
- Rioplatense Spanish con energía cálida

## Discoveries
- ReactFlow v11: `parentNode` (no `parentId`) para relaciones parent-child
- Aviat carrier model: "Red Aviat" = dominio de red de tránsito, CTRs en cada sede O dentro de `aviat_carrier` site group
- Validation bypass: `isAviatOnly` (todos los hijos son aviatCTR) OR `isAviatCarrier` (`wan_type === 'aviat_carrier'`) → skip Core INT/EXT check
- Backend Dockerfile fix: copiar a `/srv/backend/`, correr `uvicorn backend.main:app`
- Site canvas positions (canvas_x/y/w/h) guardados en DB para persistir posiciones de siteGroup

## Accomplished
- ✅ backend-topology-api: FastAPI + SQLAlchemy + PostgreSQL, CRUD sites/nodes/edges
- ✅ Docker Compose: healthchecks, service dependencies
- ✅ MCP server: stdio transport, 4 tools
- ✅ Frontend topology persistence: load/save desde backend
- ✅ aviat-edge-type: updateEdge, AviatEdge.tsx, validation.ts, PropertiesPanel, SiteGroup

---

## ARCHITECTURE DISCOVERIES

### #discovery — ReactFlow v11 controlled mode — single-writer rule
**Topic**: `architecture/reactflow-controlled-mode`
**Created**: 2026-03-28

**What**: En ReactFlow v11 con controlled mode (prop `nodes` desde Zustand), NUNCA llamar `setNodes()` de `useReactFlow()` simultáneamente.

**Why**: Bug #1 — PropertiesPanel tenía double-write que causaba que el canvas no actualizara visualmente hasta F5. `onNodesChange()` actualizaba Zustand y `setNodes()` actualizaba el internal store de RF, pero en el siguiente render RF sobreescribía su internal store desde el prop `nodes` de Zustand, dejando el canvas en el estado pre-delete.

**Correct Pattern**:
```typescript
// ✅ CORRECTO — único writer
const { deleteNode } = useGraphStore()
onClick={() => deleteNode(selectedNode.id)

// En el store, usando applyNodeChanges:
deleteNode: (id) => {
  const changes = [{ type: 'remove', id }]
  set({ nodes: applyNodeChanges(changes, get().nodes) })
}

// ❌ ROTO — double-write
onNodesChange([{ type: 'remove', id }])
setNodes(remaining) // ← NO hacer esto
```

**Where**: `frontend/src/components/GraphBuilder/PropertiesPanel.tsx`, `frontend/src/hooks/useGraphStore.ts`

---

### #pattern — Vitest — WebSocket hook con fake timers
**Topic**: `testing/websocket-hook-pattern`
**Created**: 2026-03-28

**What**: Patrón para testear hooks que usan WebSocket + backoff con Vitest.

**Pattern**:
```typescript
// 1. FakeWebSocket class
class FakeWebSocket {
  onopen = null; onclose = null; onmessage = null; onerror = null
  close = vi.fn(() => { this.onclose?.({} as CloseEvent) })
  constructor() { wsInstances.push(this) }
}

// 2. Setup
beforeEach(() => {
  wsInstances = []
  vi.useFakeTimers()
  vi.stubGlobal('WebSocket', FakeWebSocket)
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// 3. CRÍTICO — avanzar timer ANTES de acceder a instancia creada por reconnect
triggerClose(ws1)
act(() => { vi.advanceTimersByTime(1000) })
const ws2 = wsInstances[1] // ← Solo existe DESPUÉS de avanzar el timer
```

**Gotchas**:
- Paths en `vi.mock(...)` son relativos al archivo de test, no al módulo mockeado
- Desde `src/test/hooks/` → usar `../../hooks/useAgentStore`, NO `../hooks/useAgentStore`
- `renderHook` viene de `@testing-library/react` (compatible con Vitest + jsdom)

---

### #config — Git commit en Windows cmd.exe
**Topic**: `workflow/git-commit-windows`
**Created**: 2026-03-28

**Problem**: `cmd /c "git commit -m \"fix(frontend): ..."` falla porque cmd.exe interpreta los paréntesis como agrupadores de comandos.

**Solution**:
```
// Crear archivo temporal
write_to_file("tmp_commit_msg.txt", "fix(frontend): mensaje completo\n\nBody del commit...")
// Hacer commit con -F
cmd /c "git commit -F tmp_commit_msg.txt"
// Limpiar
cmd /c "del tmp_commit_msg.txt"
```

**Also**: `&&` en cmd /c con rutas con espacios puede fallar — separar en dos comandos distintos.

---

## BUGFIXES

### #bugfix — Pydantic v2 ConfigDict migration
**Topic**: `backend/pydantic-v2-migration`
**Created**: 2026-03-28

**What**: Migración de Pydantic v1 `class Config` a v2 `model_config = ConfigDict(...)` en `schemas.py`.

**Before (v1 — deprecado)**:
```python
from pydantic import BaseModel, Field

class SiteSchema(BaseModel):
    ...
    class Config:
        from_attributes = True
```

**After (v2 — correcto)**:
```python
from pydantic import BaseModel, ConfigDict, Field

class SiteSchema(BaseModel):
    ...
    model_config = ConfigDict(from_attributes=True)
```

**Modelos migrados**: SiteSchema, NetworkNodeSchema, NetworkEdgeSchema, AlertSchema, LogEntrySchema, AnalysisSchema

**Where**: `backend/models/schemas.py`

---

## SDD CHANGES ARCHIVED

### delete-node-reactflow (PR #5 — Issue #1)
**Status**: ARCHIVED — PASS
**Archived**: 2026-03-28
**Engram IDs**: explore=#231, proposal=#232, spec=#233, design=#234, tasks=#235, apply=#236, verify=#237, archive=#238

**Root Cause**: `PropertiesPanel.handleDeleteNode` llamaba tanto `onNodesChange()` (Zustand) como `setNodes()` (RF internal) — two-writer conflict en RF v11 controlled mode.

**Fix**: Eliminar `handleDeleteNode`. Delegar a `deleteNode` del store que usa `applyNodeChanges` correctamente.

**Files changed**:
- `frontend/src/components/GraphBuilder/PropertiesPanel.tsx` — -handleDeleteNode, -useReactFlow, +deleteNode del store
- `frontend/src/test/components/PropertiesPanel.test.tsx` — +S7, +S8 test cases

**Test results**: 47/47 → 47/47 vitest (no regression), tsc: 0 errors

---

### aviat-edge-type (PR #2)
**Status**: ARCHIVED — PASS
**Archived**: 2026-03-24
**Engram IDs**: verify=#217, archive=#218

**Summary**: Nuevo tipo de enlace Aviat (microondas). AviatEdge.tsx (#d97706, animated dashed), validation bypass para aviat_carrier, updateEdge/deleteEdge en store, PropertiesPanel edge type select, SiteGroup amber badge.

**Test results**: 45/45 vitest, 14/14 spec scenarios

---

### bugfix-code-review (PR #4 — Issue #3)
**Status**: ARCHIVED — PASS WITH WARNINGS
**Archived**: 2026-03-27

**Bugs fixed (P0/P1)**:
- `datetime.utcnow()` → `datetime.now(timezone.utc)` en backend
- `json_utils.py` extraído — DRY para serialización JSON en agentes
- Chat history: `_SESSION_STORE` con TTL 60min (in-memory, P2 Redis pendiente)
- MCP transport: `stdio` en lugar de `sse`
- WS exponential backoff: `Math.min(1000 * 2^n, 30_000)`
- `analysis_complete` handler: fetch REST → `setAlerts` + `setSuggestions`

**P2 backlog (pendiente)**:
- Redis session store → Issue #6 abierto
- useWebSocket tests → ✅ completado en PR #7
- Pydantic v2 ConfigDict → ✅ completado en PR #7

---

## ESTADO DEL PROYECTO
**Actualizado**: 2026-03-28

### Issues
| # | Título | Estado |
|---|--------|--------|
| #1 | delete node no visual effect | ✅ Cerrado (PR #5) |
| #3 | P0/P1 code review bugs | ✅ Cerrado (PR #4) |
| #6 | Redis-backed session store | 🔵 Abierto |

### Git log (main)
```
cc1da5d  test+refactor: useWebSocket backoff + Pydantic v2 ConfigDict (#7)
bd35034  fix(frontend): delete node/site visual effect on canvas (#5)
266146e  fix: P0/P1 bugs from code review (#4)
3532db6  chore: archive bugfix-code-review + sync main specs
fb6a719  feat: aviat edge type + graph improvements (#2)
ff77fe9  feat: initial commit
```

### Test suite
- **Frontend (vitest)**: 52/52 passing — 11 test files
- **Backend (pytest)**: funcional en entorno Docker/venv (no corre localmente: falta `pydantic_settings`)

### Environment constraints
- PowerShell bloqueado (ExecutionPolicy) — usar siempre `cmd /c "..."` para correr comandos
- `pydantic_settings` no disponible en Python local del usuario
- `git commit -m` con paréntesis falla en cmd.exe → usar `git commit -F archivo.txt`
