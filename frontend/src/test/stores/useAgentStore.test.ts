import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAgentStore } from '../../hooks/useAgentStore'
import type { LogEntry, Alert, Suggestion } from '../../types/agent'

describe('useAgentStore', () => {
  beforeEach(() => {
    act(() => useAgentStore.getState().resetAgents())
  })

  it('initializes with 5 idle agents', () => {
    expect(useAgentStore.getState().agents).toHaveLength(5)
    useAgentStore.getState().agents.forEach(a => expect(a.status).toBe('idle'))
  })

  it('setAgentStatus updates the correct agent', () => {
    act(() => useAgentStore.getState().setAgentStatus('topology_agent', 'running'))
    const agent = useAgentStore.getState().agents.find(a => a.id === 'topology_agent')
    expect(agent?.status).toBe('running')
  })

  it('addLogEntry appends entries', () => {
    const entry: LogEntry = { id: '1', agent: 'topology_agent', level: 'info', message: 'test', timestamp: new Date().toISOString() }
    act(() => useAgentStore.getState().addLogEntry(entry))
    expect(useAgentStore.getState().logEntries).toHaveLength(1)
  })

  it('setAlerts replaces alerts array', () => {
    const alerts: Alert[] = [{ id: 'a1', severity: 'critical', node: 'CTR-HQ-01', site: 'HQ', description: 'Signal low', impact: 'WAN down', metric: '-80dBm', threshold: '-70dBm' }]
    act(() => useAgentStore.getState().setAlerts(alerts))
    expect(useAgentStore.getState().alerts).toHaveLength(1)
    expect(useAgentStore.getState().alerts[0].severity).toBe('critical')
  })

  it('approveSuggestion sets approved=true', () => {
    const suggestions: Suggestion[] = [{ id: 's1', priority: 'immediate', target: 'CTR-HQ-01', action: 'Check signal', reasoning: 'Low dBm', requires_config_change: false, estimated_impact: 'Stability' }]
    act(() => {
      useAgentStore.getState().setSuggestions(suggestions)
      useAgentStore.getState().approveSuggestion('s1')
    })
    expect(useAgentStore.getState().suggestions[0].approved).toBe(true)
  })

  it('resetAgents clears log and sets all agents to idle', () => {
    act(() => {
      useAgentStore.getState().setAgentStatus('analyst_agent', 'done')
      useAgentStore.getState().addLogEntry({ id: '1', agent: 'x', level: 'info', message: 'hi', timestamp: '' })
      useAgentStore.getState().resetAgents()
    })
    expect(useAgentStore.getState().agents.every(a => a.status === 'idle')).toBe(true)
    expect(useAgentStore.getState().logEntries).toHaveLength(0)
  })

  it('setCurrentAnalysisId stores the id', () => {
    act(() => useAgentStore.getState().setCurrentAnalysisId('abc-123'))
    expect(useAgentStore.getState().currentAnalysisId).toBe('abc-123')
  })
})
