import { DB_NAME, DB_VERSION, upgradeSchema, type StoreName } from './schema'

let dbPromise: Promise<IDBDatabase> | null = null

export class DatabaseError extends Error {
  cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'DatabaseError'
    this.cause = cause
  }
}

export function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        upgradeSchema(request.result, event.oldVersion)
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        dbPromise = null
        reject(new DatabaseError('Failed to open the local database', request.error))
      }
      request.onblocked = () => {
        reject(new DatabaseError('Database upgrade blocked by another open tab'))
      }
    })
  }
  return dbPromise
}

function wrapRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new DatabaseError('Database request failed', request.error))
  })
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const result = fn(store)

    tx.onerror = () => reject(new DatabaseError('Transaction failed', tx.error))
    tx.onabort = () => reject(new DatabaseError('Transaction aborted', tx.error))

    if (result instanceof Promise) {
      result.then(resolve, reject)
    } else {
      result.onsuccess = () => resolve(result.result)
      result.onerror = () => reject(new DatabaseError('Database request failed', result.error))
    }
  })
}

export async function dbGetAll<T>(storeName: StoreName): Promise<T[]> {
  return withStore(storeName, 'readonly', (store) => store.getAll() as IDBRequest<T[]>)
}

export async function dbGet<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  return withStore(storeName, 'readonly', (store) => store.get(id) as IDBRequest<T | undefined>)
}

export async function dbPut<T>(storeName: StoreName, value: T): Promise<void> {
  await withStore(storeName, 'readwrite', (store) => store.put(value) as IDBRequest<IDBValidKey>)
}

export async function dbDelete(storeName: StoreName, id: string): Promise<void> {
  await withStore(storeName, 'readwrite', (store) => store.delete(id) as IDBRequest<undefined>)
}

export async function dbGetAllByIndex<T>(
  storeName: StoreName,
  indexName: string,
  query: IDBValidKey,
): Promise<T[]> {
  return withStore(storeName, 'readonly', (store) =>
    store.index(indexName).getAll(query) as IDBRequest<T[]>,
  )
}

export async function dbClear(storeName: StoreName): Promise<void> {
  await withStore(storeName, 'readwrite', (store) => store.clear() as IDBRequest<undefined>)
}

export async function dbBulkPut<T>(storeName: StoreName, values: T[]): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    for (const value of values) {
      store.put(value)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new DatabaseError('Bulk write failed', tx.error))
    tx.onabort = () => reject(new DatabaseError('Bulk write aborted', tx.error))
  })
}

export function wrapIdbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return wrapRequest(request)
}

/** Test-only: forces a fresh connection on the next openDatabase() call. */
export function resetConnectionForTests(): void {
  dbPromise = null
}
