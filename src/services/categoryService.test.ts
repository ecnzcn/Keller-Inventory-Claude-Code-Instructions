import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetConnectionForTests } from '../db/connection'
import { categoryService } from './categoryService'
import { ConflictError } from './errors'
import { itemService } from './itemService'

beforeEach(() => {
  resetConnectionForTests()
  indexedDB = new IDBFactory()
})

describe('categoryService', () => {
  it('assigns items to a category and counts them', async () => {
    const category = await categoryService.createCategory({ name: 'Werkzeug' })
    await itemService.createItem({ name: 'Bohrmaschine', categoryId: category.id })
    await itemService.createItem({ name: 'Akkuschrauber', categoryId: category.id })
    await itemService.createItem({ name: 'Campingstuhl' })

    expect(await categoryService.getItemCount(category.id)).toBe(2)
  })

  it('refuses to delete a category with subcategories', async () => {
    const parent = await categoryService.createCategory({ name: 'Werkzeug' })
    await categoryService.createCategory({ name: 'Elektrowerkzeug', parentId: parent.id })

    await expect(categoryService.deleteCategory(parent.id)).rejects.toThrow(ConflictError)
  })

  it('clears the category reference on items when the category is deleted', async () => {
    const category = await categoryService.createCategory({ name: 'Werkzeug' })
    const item = await itemService.createItem({ name: 'Bohrmaschine', categoryId: category.id })

    await categoryService.deleteCategory(category.id)

    const updated = await itemService.getItem(item.id)
    expect(updated?.categoryId).toBeNull()
  })
})
