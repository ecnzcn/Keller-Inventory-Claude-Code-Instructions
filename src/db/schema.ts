export const DB_NAME = 'keller-inventory'
export const DB_VERSION = 1

export const STORES = {
  items: 'items',
  locations: 'locations',
  categories: 'categories',
  tags: 'tags',
  photos: 'photos',
  documents: 'documents',
} as const

export type StoreName = (typeof STORES)[keyof typeof STORES]

export function upgradeSchema(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    const items = db.createObjectStore(STORES.items, { keyPath: 'id' })
    items.createIndex('categoryId', 'categoryId')
    items.createIndex('locationId', 'locationId')
    items.createIndex('updatedAt', 'updatedAt')
    items.createIndex('name', 'name')

    const locations = db.createObjectStore(STORES.locations, { keyPath: 'id' })
    locations.createIndex('parentId', 'parentId')

    const categories = db.createObjectStore(STORES.categories, { keyPath: 'id' })
    categories.createIndex('parentId', 'parentId')

    const tags = db.createObjectStore(STORES.tags, { keyPath: 'id' })
    tags.createIndex('name', 'name', { unique: true })

    const photos = db.createObjectStore(STORES.photos, { keyPath: 'id' })
    photos.createIndex('itemId', 'itemId')

    const documents = db.createObjectStore(STORES.documents, { keyPath: 'id' })
    documents.createIndex('itemId', 'itemId')
  }
}
