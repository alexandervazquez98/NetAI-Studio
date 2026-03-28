/**
 * RED test for handleSave payload serialisation in GraphCanvas.
 *
 * Tests that:
 * - siteGroup nodes are serialised into payload.sites (currently FAILS — sites: [] hardcoded)
 * - regular nodes are excluded from payload.nodes when they are siteGroup type (currently FAILS)
 * - regular nodes get site_id from parentNode (currently FAILS — always '')
 *
 * After TASK-1.3 (GREEN), all three assertions should pass.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { useGraphStore } from '../../hooks/useGraphStore'

// ── Mock the API module so saveGraph doesn't make real HTTP calls ─────────────
vi.mock('../../api/graph', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/graph')>()
  return {
    ...actual,
    // Keep buildSavePayload real so payload assertions work
    saveGraph: vi.fn().mockResolvedValue(undefined),
    getGraph: vi.fn().mockResolvedValue({ sites: [], nodes: [], edges: [] }),
    updateNode: vi.fn().mockResolvedValue(undefined),
    deleteNode: vi.fn().mockResolvedValue(undefined),
    exportGraph: vi.fn().mockResolvedValue({}),
  }
})

// ── Mock ReactFlow internals to avoid ResizeObserver / canvas issues ──────────
vi.mock('reactflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('reactflow')>()
  return {
    ...actual,
    // Replace the full ReactFlow component with a simple passthrough div
    default: ({ children }: { children?: React.ReactNode }) => <div data-testid="reactflow-mock">{children}</div>,
    ReactFlow: ({ children }: { children?: React.ReactNode }) => <div data-testid="reactflow-mock">{children}</div>,
    useReactFlow: () => ({
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    }),
    ReactFlowProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
  }
})

vi.mock('@reactflow/background', () => ({ Background: () => null }))

// ── Import after mocks are in place ──────────────────────────────────────────
import { GraphCanvas } from '../../components/GraphBuilder/GraphCanvas'
import { saveGraph } from '../../api/graph'

// ── Test data ────────────────────────────────────────────────────────────────

const SITE_NODE = {
  id: 'site-1',
  type: 'siteGroup',
  position: { x: 0, y: 0 },
  data: {
    label: 'HQ',
    role: 'hub',
    wan_type: 'mpls_aviat',
    observable_boundary: null,
  },
  style: { width: 400, height: 300 },
}

const REGULAR_NODE = {
  id: 'node-1',
  type: 'accessSwitch',
  position: { x: 10, y: 20 },
  // ReactFlow v11 sets parentNode on grouped nodes
  parentNode: 'site-1',
  data: {
    label: 'SW1',
    vendor: 'Cisco',
    observable: true,
  },
}

const EDGE = {
  id: 'e-1',
  source: 'node-1',
  target: 'node-1',
  type: 'fiber',
  data: {},
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GraphCanvas handleSave payload serialisation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Seed the store with our test data
    act(() => {
      useGraphStore.setState({
        nodes: [SITE_NODE as any, REGULAR_NODE as any],
        edges: [EDGE as any],
        selectedNodeId: null,
        selectedEdgeId: null,
      })
    })
  })

  it('puts siteGroup nodes into payload.sites, not payload.nodes', async () => {
    render(<GraphCanvas />)

    // Click the save button (text "Guardar")
    const saveButton = screen.getByRole('button', { name: /guardar/i })
    await act(async () => {
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(saveGraph).toHaveBeenCalledTimes(1)
    })

    const payload = (saveGraph as ReturnType<typeof vi.fn>).mock.calls[0][0]

    // RED assertion 1: sites must have the siteGroup node
    expect(payload.sites).toHaveLength(1)
    expect(payload.sites[0].id).toBe('site-1')
    expect(payload.sites[0].name).toBe('HQ')
  })

  it('excludes siteGroup nodes from payload.nodes', async () => {
    render(<GraphCanvas />)

    const saveButton = screen.getByRole('button', { name: /guardar/i })
    await act(async () => {
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(saveGraph).toHaveBeenCalledTimes(1)
    })

    const payload = (saveGraph as ReturnType<typeof vi.fn>).mock.calls[0][0]

    // RED assertion 2: nodes array must NOT contain the siteGroup
    const nodeIds = payload.nodes.map((n: { id: string }) => n.id)
    expect(nodeIds).not.toContain('site-1')
    expect(payload.nodes).toHaveLength(1)
  })

  it('resolves site_id from parentNode for regular nodes', async () => {
    render(<GraphCanvas />)

    const saveButton = screen.getByRole('button', { name: /guardar/i })
    await act(async () => {
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(saveGraph).toHaveBeenCalledTimes(1)
    })

    const payload = (saveGraph as ReturnType<typeof vi.fn>).mock.calls[0][0]

    // RED assertion 3: regular node's site_id must come from parentNode
    expect(payload.nodes[0].id).toBe('node-1')
    expect(payload.nodes[0].site_id).toBe('site-1')
  })
})
