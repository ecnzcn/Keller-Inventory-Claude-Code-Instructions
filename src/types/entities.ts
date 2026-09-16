export type Id = string

export type ItemCondition = 'new' | 'good' | 'fair' | 'poor'

export interface Item {
  id: Id
  name: string
  description: string
  categoryId: Id | null
  locationId: Id | null
  quantity: number
  unit: string
  purchaseDate: string | null
  purchasePrice: number | null
  currentValue: number | null
  condition: ItemCondition | null
  manufacturer: string
  model: string
  serialNumber: string
  notes: string
  tagIds: Id[]
  createdAt: string
  updatedAt: string
}

export interface Location {
  id: Id
  name: string
  parentId: Id | null
  description: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: Id
  name: string
  icon: string
  parentId: Id | null
  createdAt: string
  updatedAt: string
}

export interface Photo {
  id: Id
  itemId: Id
  filename: string
  mimeType: string
  data: Blob
  createdAt: string
}

export interface AppDocument {
  id: Id
  itemId: Id
  filename: string
  mimeType: string
  size: number
  data: Blob
  createdAt: string
}

export interface Tag {
  id: Id
  name: string
}

export type NewItemInput = Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'name'>> & {
  name: string
}

export type UpdateItemInput = Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt'>>

export type NewLocationInput = Partial<Omit<Location, 'id' | 'createdAt' | 'updatedAt' | 'name'>> & {
  name: string
}

export type UpdateLocationInput = Partial<Omit<Location, 'id' | 'createdAt' | 'updatedAt'>>

export type NewCategoryInput = Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'name'>> & {
  name: string
}

export type UpdateCategoryInput = Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
