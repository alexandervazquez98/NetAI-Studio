/**
 * useWebSocket hook tests
 *
 * Tests:
 * S1: onopen resets attempts counter to 0
 * S2: onclose schedules reconnect with exponential backoff delay
 * S3: consecutive closes double the delay (cap 30s)
 * S4: analysis_complete calls getAnalysis then setAlerts and setSuggestions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from '@testing-library/react'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSetAgentStatus = vi.fn()
const mockAddLogEntry    = vi.fn()
const mockSetAlerts      = vi.fn()
const mockSetSuggestions = vi.fn()

vi.mock('../../hooks/useAgentStore', () => ({
  useAgentStore: () => ({
    setAgentStatus: mockSetAgentStatus,
    addLogEntry:    mockAddLogEntry,
    setAlerts:      mockSetAlerts,
    setSuggestions: mockSetSuggestions,
  }),
}))

const mockGetAnalysis = vi.fn()
vi.mock('../../api/analysis', () => ({
  getAnalysis: (...args: unknown[]) => mockGetAnalysis(...args),
}))

// ── WebSocket mock ────────────────────────────────────────────────────────────

interface MockWS {
  onopen:    ((e: Event) => void) | null
  onclose:   ((e: CloseEvent) => void) | null
  onmessage: ((e: MessageEvent) => void) | null
  onerror:   ((e: Event) => void) | null
  close:     ReturnType<typeof vi.fn>
}

let wsInstances: MockWS[] = []

class FakeWebSocket implements MockWS {
  onopen:    ((e: Event) => void) | null    = null
  onclose:   ((e: CloseEvent) => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror:   ((e: Event) => void) | null   = null
  close = vi.fn(() => {
    this.onclose?.({} as CloseEvent)
  })

  constructor() {
    wsInstances.push(this)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const triggerOpen  = (ws: MockWS) => act(() => { ws.onopen?.({} as Event) })
const triggerClose = (ws: MockWS) => act(() => { ws.onclose?.({} as CloseEvent) })
const sendMessage  = (ws: MockWS, data: object) =>
  act(() => { ws.onmessage?.({ data: JSON.stringify(data) } as MessageEvent) })

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  wsInstances = []
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.stubGlobal('WebSocket', FakeWebSocket)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// ─────────────────────────────────────────────────────────────────────────────

import { useWebSocket } from '../../hooks/useWebSocket'

describe('useWebSocket — exponential backoff', () => {
  it('S1: onopen resets attempts counter — next close restarts backoff from 1000ms', () => {
    renderHook(() => useWebSocket('analysis-1'))
    const ws1 = wsInstances[0]

    // First close → attempts=0 → delay=1000ms
    triggerClose(ws1)
    act(() => { vi.advanceTimersByTime(1000) })

    // ws2 is created after timer fires — open it to reset attempts to 0
    const ws2 = wsInstances[1]
    triggerOpen(ws2)

    // ws2 closes → attempts was reset to 0 → delay should be 1000ms again, NOT 2000ms
    triggerClose(ws2)
    expect(wsInstances.length).toBe(2) // not reconnected yet

    act(() => { vi.advanceTimersByTime(999) })
    expect(wsInstances.length).toBe(2) // still waiting

    act(() => { vi.advanceTimersByTime(1) })
    expect(wsInstances.length).toBe(3) // reconnected at 1000ms (reset worked)
  })

  it('S2: first onclose schedules reconnect after 1000ms', () => {
    renderHook(() => useWebSocket('analysis-1'))
    const ws = wsInstances[0]

    triggerClose(ws)
    expect(wsInstances.length).toBe(1) // no reconnect yet

    act(() => { vi.advanceTimersByTime(999) })
    expect(wsInstances.length).toBe(1) // still not yet

    act(() => { vi.advanceTimersByTime(1) })
    expect(wsInstances.length).toBe(2) // reconnected at exactly 1000ms
  })

  it('S3: second close doubles delay to 2000ms', () => {
    renderHook(() => useWebSocket('analysis-1'))
    const ws1 = wsInstances[0]

    // First close → attempts=0 → delay=1000ms
    triggerClose(ws1)
    act(() => { vi.advanceTimersByTime(1000) })

    // Second close → attempts=1 → delay=2000ms
    const ws2 = wsInstances[1]
    triggerClose(ws2)
    expect(wsInstances.length).toBe(2)

    act(() => { vi.advanceTimersByTime(1999) })
    expect(wsInstances.length).toBe(2) // still waiting

    act(() => { vi.advanceTimersByTime(1) })
    expect(wsInstances.length).toBe(3) // reconnected at 2000ms
  })

  it('S3b: delay is capped at 30000ms after many failures', () => {
    renderHook(() => useWebSocket('analysis-1'))

    // Burn through 10 closes to push attempts well above cap
    for (let i = 0; i < 10; i++) {
      const ws = wsInstances[wsInstances.length - 1]
      triggerClose(ws)
      act(() => { vi.advanceTimersByTime(30_000) })
    }

    const wsBefore = wsInstances.length
    const wsLast = wsInstances[wsInstances.length - 1]
    triggerClose(wsLast)

    // Should NOT reconnect before 30s
    act(() => { vi.advanceTimersByTime(29_999) })
    expect(wsInstances.length).toBe(wsBefore)

    // Should reconnect at exactly 30s
    act(() => { vi.advanceTimersByTime(1) })
    expect(wsInstances.length).toBe(wsBefore + 1)
  })
})

describe('useWebSocket — analysis_complete handler', () => {
  it('S4: analysis_complete calls getAnalysis then setAlerts and setSuggestions', async () => {
    const fakeAlerts      = [{ id: 'a1', severity: 'critical' }]
    const fakeSuggestions = [{ action: 'restart' }]

    mockGetAnalysis.mockResolvedValue({
      alerts:     fakeAlerts,
      raw_result: { suggestions: fakeSuggestions },
    })

    renderHook(() => useWebSocket('analysis-1'))
    const ws = wsInstances[0]

    await sendMessage(ws, {
      type:        'analysis_complete',
      analysis_id: 'analysis-1',
    })

    // Wait for the async getAnalysis promise to resolve
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockGetAnalysis).toHaveBeenCalledWith('analysis-1')
    expect(mockSetAlerts).toHaveBeenCalledWith(fakeAlerts)
    expect(mockSetSuggestions).toHaveBeenCalledWith(fakeSuggestions)
  })
})
