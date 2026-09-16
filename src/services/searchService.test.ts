import { describe, expect, it } from 'vitest'
import type { Category, Item, Location, Tag } from '../types/entities'
import { buildSearchContext, filterItems, searchItems, sortItems } from './searchService'

function makeItem(overrides: Partial<Item>): Item {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'Item',
    description: '',
    categoryId: null,
    locationId: null,
    quantity: 1,
    unit: '',
    purchaseDate: null,
    purchasePrice: null,
    currentValue: null,
    condition: null,
    manufacturer: '',
    model: '',
    serialNumber: '',
    notes: '',
    tagIds: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const category: Category = {
  id: 'cat-1',
  name: 'Werkzeug',
  icon: '',
  parentId: null,
  createdAt: '',
  updatedAt: '',
}
const location: Location = {
  id: 'loc-1',
  name: 'Keller',
  parentId: null,
  description: '',
  createdAt: '',
  updatedAt: '',
}
const tag: Tag = { id: 'tag-1', name: 'Outdoor' }

const context = buildSearchContext([category], [location], [tag])

describe('searchItems', () => {
  it('is case-insensitive and matches multiple fields', () => {
    const items = [
      makeItem({ name: 'Bosch Bohrmaschine' }),
      makeItem({ name: 'Akkuschrauber', manufacturer: 'Bosch' }),
      makeItem({ name: 'Campingstuhl' }),
    ]

    expect(searchItems(items, 'bosch', context).map((i) => i.name)).toEqual([
      'Bosch Bohrmaschine',
      'Akkuschrauber',
    ])
  })

  it('matches category, location, and tag names', () => {
    const items = [
      makeItem({ name: 'A', categoryId: 'cat-1' }),
      makeItem({ name: 'B', locationId: 'loc-1' }),
      makeItem({ name: 'C', tagIds: ['tag-1'] }),
      makeItem({ name: 'D' }),
    ]

    expect(searchItems(items, 'werkzeug', context).map((i) => i.name)).toEqual(['A'])
    expect(searchItems(items, 'keller', context).map((i) => i.name)).toEqual(['B'])
    expect(searchItems(items, 'outdoor', context).map((i) => i.name)).toEqual(['C'])
  })

  it('returns all items for an empty query', () => {
    const items = [makeItem({ name: 'A' }), makeItem({ name: 'B' })]
    expect(searchItems(items, '   ', context)).toHaveLength(2)
  })
})

describe('filterItems', () => {
  it('filters by category, location, and tags', () => {
    const items = [
      makeItem({ name: 'A', categoryId: 'cat-1', locationId: 'loc-1', tagIds: ['tag-1'] }),
      makeItem({ name: 'B', categoryId: 'cat-2' }),
    ]

    expect(filterItems(items, { categoryId: 'cat-1' }).map((i) => i.name)).toEqual(['A'])
    expect(filterItems(items, { tagIds: ['tag-1'] }).map((i) => i.name)).toEqual(['A'])
  })
})

describe('sortItems', () => {
  it('sorts by name ascending and descending', () => {
    const items = [makeItem({ name: 'Zange' }), makeItem({ name: 'Akkuschrauber' })]
    expect(sortItems(items, 'name', 'asc', context).map((i) => i.name)).toEqual([
      'Akkuschrauber',
      'Zange',
    ])
    expect(sortItems(items, 'name', 'desc', context).map((i) => i.name)).toEqual([
      'Zange',
      'Akkuschrauber',
    ])
  })

  it('sorts by value, falling back to purchasePrice when currentValue is missing', () => {
    const items = [
      makeItem({ name: 'A', currentValue: 50 }),
      makeItem({ name: 'B', purchasePrice: 10 }),
      makeItem({ name: 'C' }),
    ]
    expect(sortItems(items, 'value', 'asc', context).map((i) => i.name)).toEqual(['C', 'B', 'A'])
  })
})
