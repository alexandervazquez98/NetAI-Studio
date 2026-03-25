import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ValidationModal } from '../../components/GraphBuilder/ValidationModal'
import type { ValidationResult } from '../../components/GraphBuilder/ValidationModal'

const results: ValidationResult[] = [
  { rule: 'Cada sede tiene SW-INT', status: 'pass', message: 'OK' },
  { rule: 'CTR tiene peers', status: 'fail', message: 'CTR-HQ-01 sin peers', affected: ['CTR-HQ-01'] },
  { rule: 'CPE no observable', status: 'warn', message: 'Revisar SDWAN-CPE-F' },
]

describe('ValidationModal', () => {
  it('renders all rule names', () => {
    render(<ValidationModal results={results} onClose={vi.fn()} />)
    expect(screen.getByText('Cada sede tiene SW-INT')).toBeInTheDocument()
    expect(screen.getByText('CTR tiene peers')).toBeInTheDocument()
  })

  it('shows summary with pass and fail counts', () => {
    const { container } = render(<ValidationModal results={results} onClose={vi.fn()} />)
    expect(container.textContent).toMatch(/1.*pas/i)
    expect(container.textContent).toMatch(/1.*fall/i)
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<ValidationModal results={results} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
