import type { Node, Edge } from 'reactflow';
import type { ValidationResult } from './ValidationModal';
import type { NodeData } from '../../types/nodeData';

export function runValidation(
  nodes: Node[],
  edges: Edge[],
): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Group nodes by their parentNode (site group id)
  const childrenBySite = new Map<string, typeof nodes>();
  const siteGroupIds = new Set(nodes.filter((n) => n.type === 'siteGroup').map((n) => n.id));

  for (const node of nodes) {
    const parent = (node as any).parentNode as string | undefined;
    if (parent && siteGroupIds.has(parent)) {
      const list = childrenBySite.get(parent) ?? [];
      list.push(node);
      childrenBySite.set(parent, list);
    }
  }

  // Rule 1: Site composition depends on type
  // - Aviat-only sites (all children are aviatCTR): valid with only CTRs
  // - aviat_carrier wan_type sites: bypass Core check
  // - All other sites: must have at least 1 coreInternal and 1 coreExternal
  for (const siteId of siteGroupIds) {
    const siteNode = nodes.find((n) => n.id === siteId);
    const children = childrenBySite.get(siteId) ?? [];
    const isAviatOnly = children.length > 0 && children.every((n) => n.type === 'aviatCTR');
    const isAviatCarrier = (siteNode?.data as NodeData | undefined)?.wan_type === 'aviat_carrier';

    if (isAviatOnly) {
      results.push({
        rule: 'Composición de sede',
        status: 'pass',
        message: `La sede "${siteNode?.data?.label ?? siteId}" es una red Aviat (solo CTRs).`,
        affected: [siteId],
      });
      continue;
    }

    if (isAviatCarrier) {
      results.push({
        rule: 'Composición de sede',
        status: 'pass',
        message: `La sede "${siteNode?.data?.label ?? siteId}" usa enlace aviat_carrier — composición de nodos no requerida.`,
        affected: [siteId],
      });
      continue;
    }

    const hasInternal = children.some((n) => n.type === 'coreInternal');
    const hasExternal = children.some((n) => n.type === 'coreExternal');

    if (!hasInternal || !hasExternal) {
      results.push({
        rule: 'Composición de sede',
        status: 'fail',
        message: `La sede "${siteNode?.data?.label ?? siteId}" debe contener al menos un Core Interno y un Core Externo.`,
        affected: [siteId],
      });
    } else {
      results.push({
        rule: 'Composición de sede',
        status: 'pass',
        message: `La sede "${siteNode?.data?.label ?? siteId}" tiene Core Interno y Core Externo.`,
        affected: [siteId],
      });
    }
  }

  // Rule 2: Each AviatCTR must have at least one connected edge
  const aviatNodes = nodes.filter((n) => n.type === 'aviatCTR');
  for (const aviat of aviatNodes) {
    const connected = edges.some((e) => e.source === aviat.id || e.target === aviat.id);
    results.push({
      rule: 'Aviat CTR conectado',
      status: connected ? 'pass' : 'fail',
      message: connected
        ? `Nodo Aviat CTR "${aviat.data?.label ?? aviat.id}" está conectado.`
        : `Nodo Aviat CTR "${aviat.data?.label ?? aviat.id}" no tiene conexiones.`,
      affected: [aviat.id],
    });
  }

  // Rule 3: SdwanCPE nodes must not have observable: true
  const sdwanNodes = nodes.filter((n) => n.type === 'sdwanCPE');
  for (const cpe of sdwanNodes) {
    const nodeData = cpe.data as NodeData;
    if (nodeData.observable === true) {
      results.push({
        rule: 'SD-WAN CPE no observable',
        status: 'warn',
        message: `Nodo SD-WAN CPE "${nodeData.label ?? cpe.id}" tiene observable=true. Debería ser caja negra.`,
        affected: [cpe.id],
      });
    } else {
      results.push({
        rule: 'SD-WAN CPE no observable',
        status: 'pass',
        message: `Nodo SD-WAN CPE "${nodeData.label ?? cpe.id}" correctamente marcado como caja negra.`,
        affected: [cpe.id],
      });
    }
  }

  // If no site groups at all, add info
  if (siteGroupIds.size === 0) {
    results.push({
      rule: 'Composición de sede',
      status: 'warn',
      message: 'No hay grupos de sede en el canvas.',
    });
  }

  return results;
}
