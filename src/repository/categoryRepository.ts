import { STORES } from '../db/schema'
import type { Category } from '../types/entities'
import { createRepository } from './createRepository'

const base = createRepository<Category>(STORES.categories)

export const categoryRepository = {
  ...base,
  /**
   * `parentId: null` is not a valid IndexedDB index key, so root categories
   * are never present in the `parentId` index — fetch and filter instead.
   */
  listByParent: async (parentId: string | null): Promise<Category[]> => {
    if (parentId === null) {
      const all = await base.list()
      return all.filter((category) => category.parentId === null)
    }
    return base.listByIndex('parentId', parentId)
  },
}
