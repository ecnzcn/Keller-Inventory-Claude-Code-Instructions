import { STORES } from '../db/schema'
import type { Location } from '../types/entities'
import { createRepository } from './createRepository'

const base = createRepository<Location>(STORES.locations)

export const locationRepository = {
  ...base,
  /**
   * `parentId: null` is not a valid IndexedDB index key, so root locations
   * are never present in the `parentId` index — fetch and filter instead.
   */
  listByParent: async (parentId: string | null): Promise<Location[]> => {
    if (parentId === null) {
      const all = await base.list()
      return all.filter((location) => location.parentId === null)
    }
    return base.listByIndex('parentId', parentId)
  },
}
