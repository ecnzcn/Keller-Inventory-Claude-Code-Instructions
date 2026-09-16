interface HierarchicalNode {
  id: string
  name: string
  parentId: string | null
}

/** Builds "Keller › Regal 3 › Fach B" style breadcrumb labels for every node, without extra DB round-trips. */
export function buildHierarchyLabels<T extends HierarchicalNode>(nodes: T[]): Map<string, string> {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const labels = new Map<string, string>()

  function labelFor(id: string): string {
    const cached = labels.get(id)
    if (cached) return cached
    const node = byId.get(id)
    if (!node) return ''
    const label = node.parentId && byId.has(node.parentId) ? `${labelFor(node.parentId)} › ${node.name}` : node.name
    labels.set(id, label)
    return label
  }

  for (const node of nodes) labelFor(node.id)
  return labels
}
