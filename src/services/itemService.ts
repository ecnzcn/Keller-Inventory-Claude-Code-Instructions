import { documentRepository } from '../repository/documentRepository'
import { itemRepository } from '../repository/itemRepository'
import { photoRepository } from '../repository/photoRepository'
import type { Item, NewItemInput, UpdateItemInput } from '../types/entities'
import { changeBus } from './changeBus'
import { ValidationError } from './errors'

function normalizeItem(input: NewItemInput): Omit<Item, 'id' | 'createdAt' | 'updatedAt'> {
  const name = input.name.trim()
  if (!name) {
    throw new ValidationError('Item name is required.')
  }
  return {
    name,
    description: input.description?.trim() ?? '',
    categoryId: input.categoryId ?? null,
    locationId: input.locationId ?? null,
    quantity: input.quantity ?? 1,
    unit: input.unit?.trim() ?? '',
    purchaseDate: input.purchaseDate ?? null,
    purchasePrice: input.purchasePrice ?? null,
    currentValue: input.currentValue ?? null,
    condition: input.condition ?? null,
    manufacturer: input.manufacturer?.trim() ?? '',
    model: input.model?.trim() ?? '',
    serialNumber: input.serialNumber?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
    tagIds: input.tagIds ?? [],
  }
}

export const itemService = {
  listItems: (): Promise<Item[]> => itemRepository.list(),

  getItem: (id: string): Promise<Item | undefined> => itemRepository.get(id),

  createItem: async (input: NewItemInput): Promise<Item> => {
    const now = new Date().toISOString()
    const item: Item = {
      id: crypto.randomUUID(),
      ...normalizeItem(input),
      createdAt: now,
      updatedAt: now,
    }
    await itemRepository.save(item)
    changeBus.emit('item')
    return item
  },

  updateItem: async (id: string, input: UpdateItemInput): Promise<Item> => {
    const existing = await itemRepository.get(id)
    if (!existing) {
      throw new ValidationError('Item not found.')
    }
    const merged = normalizeItem({ ...existing, ...input, name: input.name ?? existing.name })
    const updated: Item = {
      ...existing,
      ...merged,
      updatedAt: new Date().toISOString(),
    }
    await itemRepository.save(updated)
    changeBus.emit('item')
    return updated
  },

  deleteItem: async (id: string): Promise<void> => {
    const [photos, documents] = await Promise.all([
      photoRepository.listByItem(id),
      documentRepository.listByItem(id),
    ])
    await Promise.all([
      ...photos.map((photo) => photoRepository.remove(photo.id)),
      ...documents.map((document) => documentRepository.remove(document.id)),
    ])
    await itemRepository.remove(id)
    changeBus.emit('item')
    changeBus.emit('photo')
    changeBus.emit('document')
  },

  /** Clears the category from every item that references it (called before/after deleting a category). */
  clearCategoryFromItems: async (categoryId: string): Promise<void> => {
    const items = await itemRepository.listByCategory(categoryId)
    await Promise.all(
      items.map((item) => itemRepository.save({ ...item, categoryId: null, updatedAt: new Date().toISOString() })),
    )
    if (items.length > 0) changeBus.emit('item')
  },

  /** Clears the location from every item that references it (called before/after deleting a location). */
  clearLocationFromItems: async (locationId: string): Promise<void> => {
    const items = await itemRepository.listByLocation(locationId)
    await Promise.all(
      items.map((item) => itemRepository.save({ ...item, locationId: null, updatedAt: new Date().toISOString() })),
    )
    if (items.length > 0) changeBus.emit('item')
  },

  /** Removes a tag reference from every item that has it (called after deleting a tag). */
  removeTagFromItems: async (tagId: string): Promise<void> => {
    const items = await itemRepository.list()
    const affected = items.filter((item) => item.tagIds.includes(tagId))
    await Promise.all(
      affected.map((item) =>
        itemRepository.save({
          ...item,
          tagIds: item.tagIds.filter((id) => id !== tagId),
          updatedAt: new Date().toISOString(),
        }),
      ),
    )
    if (affected.length > 0) changeBus.emit('item')
  },
}
