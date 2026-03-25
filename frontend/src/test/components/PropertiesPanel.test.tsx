/**
 * TASK 5.1 RED — PropertiesPanel tests
 *
 * Tests:
 * S4: edge panel shows a <select> with 4 options: fiber/mpls/sdwan/aviat
 * S5: changing the edge type select calls updateEdge
 * S6: siteGroup panel shows aviat_carrier in the wan_type select
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from '@testing-library/react'
import { useGraphStore } from '../../hooks/useGraphStore'

// ── Minimal reactflow mock ────────────────────────────────────────────────────
vi.mock('reactflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('reactflow')>()
  return {
    ...actual,
    useReactFlow: () => ({
      deleteElements: vi.fn(),
    }),
  }
})

import { PropertiesPanel } from '../../components/GraphBuilder/PropertiesPanel'

// ── Test data ─────────────────────────────────────────────────────────────────

const EDGE_FIBER = {
  id: 'e1',
  source: 'n1',
  target: 'n2',
  type: 'fiber',
  data: {},
}

const SITE_NODE = {
  id: 'site-1',
  type: 'siteGroup',
  position: { x: 0, y: 0 },
  data: { label: 'HQ', wan_type: 'MPLS' },
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PropertiesPanel edge panel', () => {
  beforeEach(() => {
    act(() => {
      useGraphStore.setState({
        nodes: [],
        edges: [EDGE_FIBER as any],
        selectedNodeId: null,
        selectedEdgeId: 'e1',
      })
    })
  })

  it('S4: edge panel renders a select with fiber, mpls, sdwan, aviat options', () => {
    render(<PropertiesPanel />)
    const select = screen.getByRole('combobox', { name: /tipo de enlace/i })
    expect(select).toBeDefined()
    const options = Array.from(select.querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value)
    expect(options).toContain('fiber')
    expect(options).toContain('mpls')
    expect(options).toContain('sdwan')
    expect(options).toContain('aviat')
  })

  it('S5: changing edge type select calls updateEdge with new type', () => {
    const updateEdgeSpy = vi.fn()
    act(() => {
      useGraphStore.setState({
        updateEdge: updateEdgeSpy,
      } as any)
    })

    render(<PropertiesPanel />)
    const select = screen.getByRole('combobox', { name: /tipo de enlace/i })
    fireEvent.change(select, { target: { value: 'aviat' } })
    expect(updateEdgeSpy).toHaveBeenCalledWith('e1', { type: 'aviat' })
  })
})

describe('PropertiesPanel siteGroup panel', () => {
  beforeEach(() => {
    act(() => {
      useGraphStore.setState({
        nodes: [SITE_NODE as any],
        edges: [],
        selectedNodeId: 'site-1',
        selectedEdgeId: null,
      })
    })
  })

  it('S6: wan_type select includes aviat_carrier option', () => {
    render(<PropertiesPanel />)
    const select = screen.getByRole('combobox', { name: /tipo wan/i })
    const options = Array.from(select.querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value)
    expect(options).toContain('aviat_carrier')
  })
})
