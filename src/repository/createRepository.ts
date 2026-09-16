import { dbDelete, dbGet, dbGetAll, dbGetAllByIndex, dbPut } from '../db/connection'
import type { StoreName } from '../db/schema'

export interface Repository<T extends { id: string }> {
  list(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  save(value: T): Promise<void>
  remove(id: string): Promise<void>
  listByIndex(indexName: string, value: IDBValidKey): Promise<T[]>
}

export function createRepository<T extends { id: string }>(storeName: StoreName): Repository<T> {
  return {
    list: () => dbGetAll<T>(storeName),
    get: (id) => dbGet<T>(storeName, id),
    save: (value) => dbPut<T>(storeName, value),
    remove: (id) => dbDelete(storeName, id),
    listByIndex: (indexName, value) => dbGetAllByIndex<T>(storeName, indexName, value),
  }
}
