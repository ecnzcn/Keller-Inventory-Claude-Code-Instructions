import { describe, expect, it } from 'vitest'
import { buildHierarchyLabels } from './hierarchyLabels'

describe('buildHierarchyLabels', () => {
  it('joins ancestor names with a separator', () => {
    const labels = buildHierarchyLabels([
      { id: 'keller', name: 'Keller', parentId: null },
      { id: 'regal3', name: 'Regal 3', parentId: 'keller' },
      { id: 'fachB', name: 'Fach B', parentId: 'regal3' },
    ])

    expect(labels.get('keller')).toBe('Keller')
    expect(labels.get('regal3')).toBe('Keller › Regal 3')
    expect(labels.get('fachB')).toBe('Keller › Regal 3 › Fach B')
  })
})
