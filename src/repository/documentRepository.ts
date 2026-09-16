import { STORES } from '../db/schema'
import type { AppDocument } from '../types/entities'
import { createRepository } from './createRepository'

const base = createRepository<AppDocument>(STORES.documents)

export const documentRepository = {
  ...base,
  listByItem: (itemId: string) => base.listByIndex('itemId', itemId),
}
