import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useGraphStore } from '../../hooks/useGraphStore'

describe('useGraphStore', () => {
  beforeEach(() => {
    useGraphStore.setState({ nodes: [], edges: [], selectedNodeId: null, selectedEdgeId: null })
  })

  it('addNode adds a node to the store', () => {
    const node = { id: 'n1', type: 'coreInternal', position: { x: 0, y: 0 }, data: { label: 'SW-01' } }
    act(() => useGraphStore.getState().addNode(node))
    expect(useGraphStore.getState().nodes).toHaveLength(1)
    expect(useGraphStore.getState().nodes[0].id).toBe('n1')
  })

  it('deleteNode removes a node and its connected edges', () => {
    const node = { id: 'n1', type: 'coreInternal', position: { x: 0, y: 0 }, data: { label: 'SW-01' } }
    const edge = { id: 'e1', source: 'n1', target: 'n2' }
    act(() => {
      useGraphStore.setState({ nodes: [node], edges: [edge] })
      useGraphStore.getState().deleteNode('n1')
    })
    expect(useGraphStore.getState().nodes).toHaveLength(0)
    expect(useGraphStore.getState().edges).toHaveLength(0)
  })

  it('updateNodeData patches node data', () => {
    const node = { id: 'n1', type: 'coreInternal', position: { x: 0, y: 0 }, data: { label: 'SW-01', observable: true } }
    act(() => {
      useGraphStore.setState({ nodes: [node] })
      useGraphStore.getState().updateNodeData('n1', { label: 'SW-02', observable: false })
    })
    const updated = useGraphStore.getState().nodes[0]
    expect(updated.data.label).toBe('SW-02')
    expect(updated.data.observable).toBe(false)
  })

  it('selectNode sets selectedNodeId and clears selectedEdgeId', () => {
    act(() => {
      useGraphStore.setState({ selectedEdgeId: 'e1' })
      useGraphStore.getState().selectNode('n1')
    })
    expect(useGraphStore.getState().selectedNodeId).toBe('n1')
    expect(useGraphStore.getState().selectedEdgeId).toBeNull()
  })

  it('setGraph replaces nodes and edges', () => {
    const nodes = [{ id: 'n1', type: 'coreInternal', position: { x: 0, y: 0 }, data: {} }]
    const edges = [{ id: 'e1', source: 'n1', target: 'n2' }]
    act(() => useGraphStore.getState().setGraph(nodes as any, edges as any))
    expect(useGraphStore.getState().nodes).toHaveLength(1)
    expect(useGraphStore.getState().edges).toHaveLength(1)
  })

  // TASK 1.1 RED — updateEdge
  it('updateEdge changes the type of an existing edge', () => {
    const edge = { id: 'e1', source: 'n1', target: 'n2', type: 'fiber', data: {} }
    act(() => {
      useGraphStore.setState({ edges: [edge as any] })
      useGraphStore.getState().updateEdge('e1', { type: 'aviat' })
    })
    const updated = useGraphStore.getState().edges[0]
    expect(updated.type).toBe('aviat')
    expect(updated.id).toBe('e1')
  })

  it('updateEdge merges data without replacing the whole edge', () => {
    const edge = { id: 'e2', source: 'n1', target: 'n2', type: 'mpls', data: { vrf: 'RED' } }
    act(() => {
      useGraphStore.setState({ edges: [edge as any] })
      useGraphStore.getState().updateEdge('e2', { data: { vrf: 'BLUE' } })
    })
    const updated = useGraphStore.getState().edges[0]
    expect(updated.type).toBe('mpls')
    expect(updated.data?.vrf).toBe('BLUE')
  })

  it('updateEdge does not mutate other edges', () => {
    const e1 = { id: 'e1', source: 'n1', target: 'n2', type: 'fiber', data: {} }
    const e2 = { id: 'e2', source: 'n2', target: 'n3', type: 'mpls', data: {} }
    act(() => {
      useGraphStore.setState({ edges: [e1 as any, e2 as any] })
      useGraphStore.getState().updateEdge('e1', { type: 'aviat' })
    })
    expect(useGraphStore.getState().edges[1].type).toBe('mpls')
  })
})
