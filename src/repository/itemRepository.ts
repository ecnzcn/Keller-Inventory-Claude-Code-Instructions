import { STORES } from '../db/schema'
import type { Item } from '../types/entities'
import { createRepository } from './createRepository'

const base = createRepository<Item>(STORES.items)

export const itemRepository = {
  ...base,
  listByCategory: (categoryId: string) => base.listByIndex('categoryId', categoryId),
  listByLocation: (locationId: string) => base.listByIndex('locationId', locationId),
  /** Items with no category assigned (`categoryId: null` is not an indexable key). */
  listUncategorized: async (): Promise<Item[]> => {
    const all = await base.list()
    return all.filter((item) => item.categoryId === null)
  },
  /** Items with no location assigned (`locationId: null` is not an indexable key). */
  listUnlocated: async (): Promise<Item[]> => {
    const all = await base.list()
    return all.filter((item) => item.locationId === null)
  },
}
