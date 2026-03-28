/**
 * PropertiesPanel tests
 *
 * Tests:
 * S4: edge panel shows a <select> with 4 options: fiber/mpls/sdwan/aviat
 * S5: changing the edge type select calls updateEdge
 * S6: siteGroup panel shows aviat_carrier in the wan_type select
 * S7: clicking "Eliminar nodo" calls deleteNode with the node id
 * S8: clicking "Eliminar sede y sus equipos" calls deleteNode with the site group id
 * S9: clicking "Eliminar nodo" calls saveGraph (auto-save)
 * S10: clicking "Eliminar sede..." calls saveGraph (auto-save)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { useGraphStore } from '../../hooks/useGraphStore'

const mockSaveGraph = vi.fn().mockResolvedValue(undefined)
vi.mock('../../api/graph', () => ({
  saveGraph: (...args: unknown[]) => mockSaveGraph(...args),
  buildSavePayload: vi.fn().mockReturnValue({ sites: [], nodes: [], edges: [] }),
}))

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

// ── Delete node tests ─────────────────────────────────────────────────────────

const REGULAR_NODE = {
  id: 'n1',
  type: 'coreInternal',
  position: { x: 0, y: 0 },
  data: { label: 'Core INT', observable: true },
}

describe('PropertiesPanel delete', () => {
  it('S7: clicking "Eliminar nodo" opens confirmation modal, then deleteNode is called on confirm', async () => {
    const deleteNodeSpy = vi.fn()
    act(() => {
      useGraphStore.setState({
        nodes: [REGULAR_NODE as any],
        edges: [],
        selectedNodeId: 'n1',
        selectedEdgeId: null,
        deleteNode: deleteNodeSpy,
        markSaved: vi.fn(),
      } as any)
    })

    render(<PropertiesPanel />)
    // First click opens the modal — deleteNode NOT called yet
    const btn = screen.getByRole('button', { name: /eliminar nodo/i })
    fireEvent.click(btn)
    expect(deleteNodeSpy).not.toHaveBeenCalled()

    // Modal appears with confirm button
    const confirmBtn = await screen.findByRole('button', { name: /sí, eliminar/i })
    fireEvent.click(confirmBtn)
    await waitFor(() => expect(deleteNodeSpy).toHaveBeenCalledWith('n1'))
  })

  it('S7b: clicking "Cancelar" in modal does NOT call deleteNode', async () => {
    const deleteNodeSpy = vi.fn()
    act(() => {
      useGraphStore.setState({
        nodes: [REGULAR_NODE as any],
        edges: [],
        selectedNodeId: 'n1',
        selectedEdgeId: null,
        deleteNode: deleteNodeSpy,
      } as any)
    })

    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: /eliminar nodo/i }))
    const cancelBtn = await screen.findByRole('button', { name: /cancelar/i })
    fireEvent.click(cancelBtn)
    expect(deleteNodeSpy).not.toHaveBeenCalled()
  })

  it('S8: clicking "Eliminar sede..." opens modal, confirm calls deleteNode with site id', async () => {
    const deleteNodeSpy = vi.fn()
    act(() => {
      useGraphStore.setState({
        nodes: [SITE_NODE as any],
        edges: [],
        selectedNodeId: 'site-1',
        selectedEdgeId: null,
        deleteNode: deleteNodeSpy,
        markSaved: vi.fn(),
      } as any)
    })

    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: /eliminar sede/i }))
    expect(deleteNodeSpy).not.toHaveBeenCalled()

    const confirmBtn = await screen.findByRole('button', { name: /sí, eliminar/i })
    fireEvent.click(confirmBtn)
    await waitFor(() => expect(deleteNodeSpy).toHaveBeenCalledWith('site-1'))
  })
})

describe('PropertiesPanel auto-save on delete', () => {
  beforeEach(() => {
    mockSaveGraph.mockClear()
    useGraphStore.setState({
      nodes: [], edges: [],
      selectedNodeId: null, selectedEdgeId: null,
      isDirty: false,
    } as any)
  })

  it('S9: confirming "Eliminar nodo" calls saveGraph automatically', async () => {
    const NODE = { id: 'n1', type: 'coreInternal', position: { x: 0, y: 0 }, data: { label: 'Core INT' } }
    act(() => {
      useGraphStore.setState({
        nodes: [NODE as any], edges: [],
        selectedNodeId: 'n1', selectedEdgeId: null,
      } as any)
    })
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: /eliminar nodo/i }))
    const confirmBtn = await screen.findByRole('button', { name: /sí, eliminar/i })
    fireEvent.click(confirmBtn)
    await waitFor(() => expect(mockSaveGraph).toHaveBeenCalledTimes(1))
  })

  it('S10: confirming "Eliminar sede..." calls saveGraph automatically', async () => {
    const SITE = { id: 'site-1', type: 'siteGroup', position: { x: 0, y: 0 }, data: { label: 'Sede', wan_type: 'mpls' } }
    act(() => {
      useGraphStore.setState({
        nodes: [SITE as any], edges: [],
        selectedNodeId: 'site-1', selectedEdgeId: null,
      } as any)
    })
    render(<PropertiesPanel />)
    fireEvent.click(screen.getByRole('button', { name: /eliminar sede/i }))
    const confirmBtn = await screen.findByRole('button', { name: /sí, eliminar/i })
    fireEvent.click(confirmBtn)
    await waitFor(() => expect(mockSaveGraph).toHaveBeenCalledTimes(1))
  })
})
