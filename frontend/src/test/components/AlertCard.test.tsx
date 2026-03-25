import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlertCard } from '../../components/Insights/AlertCard'
import type { Alert } from '../../types/agent'

const criticalAlert: Alert = {
  id: 'a1', severity: 'critical', node: 'CTR-HQ-01', site: 'HQ',
  description: 'Señal muy baja', impact: 'Corte WAN inminente',
  metric: '-80dBm', threshold: '-70dBm',
}

const warningAlert: Alert = { ...criticalAlert, id: 'a2', severity: 'warning', description: 'Utilización alta' }
const infoAlert: Alert = { ...criticalAlert, id: 'a3', severity: 'info', description: 'Sin redundancia' }

describe('AlertCard', () => {
  it('renders node and site names', () => {
    render(<AlertCard alert={criticalAlert} />)
    expect(screen.getByText('CTR-HQ-01')).toBeInTheDocument()
    expect(screen.getByText('HQ')).toBeInTheDocument()
  })

  it('renders description and impact', () => {
    const { container } = render(<AlertCard alert={criticalAlert} />)
    expect(container.textContent).toContain('Señal muy baja')
    expect(container.textContent).toContain('Corte WAN inminente')
  })

  it('renders metric and threshold', () => {
    const { container } = render(<AlertCard alert={criticalAlert} />)
    expect(container.textContent).toContain('-80dBm')
    expect(container.textContent).toContain('-70dBm')
  })

  it('renders CRÍTICO badge for critical severity', () => {
    render(<AlertCard alert={criticalAlert} />)
    expect(screen.getByText('CRÍTICO')).toBeInTheDocument()
  })

  it('renders ATENCIÓN badge for warning severity', () => {
    render(<AlertCard alert={warningAlert} />)
    expect(screen.getByText('ATENCIÓN')).toBeInTheDocument()
  })

  it('renders INFO badge for info severity', () => {
    render(<AlertCard alert={infoAlert} />)
    expect(screen.getByText('INFO')).toBeInTheDocument()
  })
})
