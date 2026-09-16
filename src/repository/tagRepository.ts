import { STORES } from '../db/schema'
import type { Tag } from '../types/entities'
import { createRepository } from './createRepository'

const base = createRepository<Tag>(STORES.tags)

export const tagRepository = {
  ...base,
  findByName: async (name: string): Promise<Tag | undefined> => {
    const matches = await base.listByIndex('name', name)
    return matches[0]
  },
}
