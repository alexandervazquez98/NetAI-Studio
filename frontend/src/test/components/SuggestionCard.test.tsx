import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SuggestionCard } from '../../components/Insights/SuggestionCard'
import { useAgentStore } from '../../hooks/useAgentStore'
import type { Suggestion } from '../../types/agent'
import { act } from '@testing-library/react'

const suggestion: Suggestion = {
  id: 's1', priority: 'immediate', target: 'CTR-HQ-01',
  action: 'Revisar señal de microondas', reasoning: 'Señal < -70dBm',
  requires_config_change: true, estimated_impact: 'Elimina riesgo de corte',
}

describe('SuggestionCard', () => {
  beforeEach(() => {
    act(() => {
      useAgentStore.getState().setSuggestions([suggestion])
    })
  })

  it('renders the action and target', () => {
    render(<SuggestionCard />)
    expect(screen.getByText(/Revisar señal/i)).toBeInTheDocument()
    expect(screen.getByText(/CTR-HQ-01/i)).toBeInTheDocument()
  })

  it('Aprobar button approves the suggestion', () => {
    render(<SuggestionCard />)
    fireEvent.click(screen.getByRole('button', { name: /aprobar/i }))
    expect(useAgentStore.getState().suggestions[0].approved).toBe(true)
  })
})
