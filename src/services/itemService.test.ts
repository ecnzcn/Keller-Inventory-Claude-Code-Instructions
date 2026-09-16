import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetConnectionForTests } from '../db/connection'
import { documentRepository } from '../repository/documentRepository'
import { photoRepository } from '../repository/photoRepository'
import { ValidationError } from './errors'
import { itemService } from './itemService'

beforeEach(() => {
  resetConnectionForTests()
  indexedDB = new IDBFactory()
})

describe('itemService', () => {
  it('creates an item with only a name and sensible defaults', async () => {
    const item = await itemService.createItem({ name: '  Bohrmaschine  ' })
    expect(item.name).toBe('Bohrmaschine')
    expect(item.quantity).toBe(1)
    expect(item.categoryId).toBeNull()
    expect(item.locationId).toBeNull()
    expect(item.createdAt).toBe(item.updatedAt)
  })

  it('rejects creating an item without a name', async () => {
    await expect(itemService.createItem({ name: '   ' })).rejects.toThrow(ValidationError)
  })

  it('updates an item and bumps updatedAt', async () => {
    const item = await itemService.createItem({ name: 'Bohrmaschine' })
    await new Promise((resolve) => setTimeout(resolve, 2))
    const updated = await itemService.updateItem(item.id, { quantity: 3, notes: 'Verliehen an Tom' })

    expect(updated.quantity).toBe(3)
    expect(updated.notes).toBe('Verliehen an Tom')
    expect(updated.name).toBe('Bohrmaschine')
    expect(updated.updatedAt).not.toBe(item.updatedAt)
  })

  it('deletes an item along with its photos and documents', async () => {
    const item = await itemService.createItem({ name: 'Bohrmaschine' })
    await photoRepository.save({
      id: 'p1',
      itemId: item.id,
      filename: 'a.jpg',
      mimeType: 'image/jpeg',
      data: new Blob(),
      createdAt: new Date().toISOString(),
    })
    await documentRepository.save({
      id: 'd1',
      itemId: item.id,
      filename: 'manual.pdf',
      mimeType: 'application/pdf',
      size: 0,
      data: new Blob(),
      createdAt: new Date().toISOString(),
    })

    await itemService.deleteItem(item.id)

    expect(await itemService.getItem(item.id)).toBeUndefined()
    expect(await photoRepository.listByItem(item.id)).toHaveLength(0)
    expect(await documentRepository.listByItem(item.id)).toHaveLength(0)
  })
})
