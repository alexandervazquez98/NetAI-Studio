/**
 * TASK 4.1 RED — runValidation extracted to validation.ts
 *
 * Tests:
 * - S7: aviat_carrier site with only coreInternal → validation PASS, message contains 'aviat_carrier'
 * - S8: MPLS site missing coreExternal → validation FAIL (regression)
 * - existing isAviatOnly bypass still works
 */

import { describe, it, expect } from 'vitest'
import { runValidation } from '../../components/GraphBuilder/validation'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSite(id: string, label: string, wanType?: string) {
  return {
    id,
    type: 'siteGroup',
    position: { x: 0, y: 0 },
    data: { label, wan_type: wanType },
  }
}

function makeNode(id: string, type: string, parentId: string) {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    parentNode: parentId,
    data: { label: id },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runValidation (extracted)', () => {
  it('S7: aviat_carrier site with only coreInternal nodes passes and message contains aviat_carrier', () => {
    const site = makeSite('s1', 'Sede Aviat', 'aviat_carrier')
    const child = makeNode('n1', 'coreInternal', 's1')
    const results = runValidation([site as any, child as any], [])
    const siteResult = results.find((r) => r.rule === 'Composición de sede')
    expect(siteResult).toBeDefined()
    expect(siteResult!.status).toBe('pass')
    expect(siteResult!.message).toContain('aviat_carrier')
  })

  it('S8 regression: MPLS site missing coreExternal fails', () => {
    const site = makeSite('s2', 'Sede MPLS', 'MPLS')
    const child = makeNode('n2', 'coreInternal', 's2')
    const results = runValidation([site as any, child as any], [])
    const siteResult = results.find((r) => r.rule === 'Composición de sede')
    expect(siteResult).toBeDefined()
    expect(siteResult!.status).toBe('fail')
  })

  it('existing isAviatOnly bypass: site with only aviatCTR children passes', () => {
    const site = makeSite('s3', 'Sede CTR')
    const child = makeNode('n3', 'aviatCTR', 's3')
    const results = runValidation([site as any, child as any], [])
    const siteResult = results.find((r) => r.rule === 'Composición de sede')
    expect(siteResult).toBeDefined()
    expect(siteResult!.status).toBe('pass')
  })

  it('normal site with both coreInternal and coreExternal passes', () => {
    const site = makeSite('s4', 'Sede Normal')
    const int = makeNode('n4a', 'coreInternal', 's4')
    const ext = makeNode('n4b', 'coreExternal', 's4')
    const results = runValidation([site as any, int as any, ext as any], [])
    const siteResult = results.find((r) => r.rule === 'Composición de sede')
    expect(siteResult!.status).toBe('pass')
  })
})
