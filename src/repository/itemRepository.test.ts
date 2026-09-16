import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetConnectionForTests } from '../db/connection'
import type { Item } from '../types/entities'
import { itemRepository } from './itemRepository'

function makeItem(overrides: Partial<Item> = {}): Item {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'Bohrmaschine',
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

beforeEach(() => {
  resetConnectionForTests()
  indexedDB = new IDBFactory()
})

describe('itemRepository', () => {
  it('saves and retrieves an item', async () => {
    const item = makeItem()
    await itemRepository.save(item)

    const found = await itemRepository.get(item.id)
    expect(found).toEqual(item)
  })

  it('lists all items', async () => {
    await itemRepository.save(makeItem({ name: 'A' }))
    await itemRepository.save(makeItem({ name: 'B' }))

    const all = await itemRepository.list()
    expect(all).toHaveLength(2)
  })

  it('removes an item', async () => {
    const item = makeItem()
    await itemRepository.save(item)
    await itemRepository.remove(item.id)

    const found = await itemRepository.get(item.id)
    expect(found).toBeUndefined()
  })

  it('finds items with no category via listUncategorized, excluding categorized ones', async () => {
    const uncategorized = makeItem({ categoryId: null })
    const categorized = makeItem({ categoryId: 'cat-1' })
    await itemRepository.save(uncategorized)
    await itemRepository.save(categorized)

    const result = await itemRepository.listUncategorized()
    expect(result.map((i) => i.id)).toEqual([uncategorized.id])
  })

  it('lists items by category via the index', async () => {
    const item = makeItem({ categoryId: 'cat-1' })
    await itemRepository.save(item)
    await itemRepository.save(makeItem({ categoryId: 'cat-2' }))

    const result = await itemRepository.listByCategory('cat-1')
    expect(result.map((i) => i.id)).toEqual([item.id])
  })
})
