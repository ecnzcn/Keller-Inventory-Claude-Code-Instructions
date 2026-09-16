import { STORES } from '../db/schema'
import type { Photo } from '../types/entities'
import { createRepository } from './createRepository'

const base = createRepository<Photo>(STORES.photos)

export const photoRepository = {
  ...base,
  listByItem: (itemId: string) => base.listByIndex('itemId', itemId),
}
