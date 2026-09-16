import { categoryRepository } from '../repository/categoryRepository'
import { itemRepository } from '../repository/itemRepository'
import type { Category, NewCategoryInput, UpdateCategoryInput } from '../types/entities'
import { changeBus } from './changeBus'
import { ConflictError, NotFoundError, ValidationError } from './errors'
import { itemService } from './itemService'

async function wouldCreateCycle(id: string, newParentId: string | null): Promise<boolean> {
  let currentId = newParentId
  while (currentId !== null) {
    if (currentId === id) return true
    const current = await categoryRepository.get(currentId)
    currentId = current?.parentId ?? null
  }
  return false
}

export const categoryService = {
  listAll: (): Promise<Category[]> => categoryRepository.list(),

  listRoots: (): Promise<Category[]> => categoryRepository.listByParent(null),

  listChildren: (parentId: string): Promise<Category[]> => categoryRepository.listByParent(parentId),

  getCategory: (id: string): Promise<Category | undefined> => categoryRepository.get(id),

  getItemCount: async (id: string, options: { includeDescendants?: boolean } = {}): Promise<number> => {
    const direct = await itemRepository.listByCategory(id)
    if (!options.includeDescendants) return direct.length
    const children = await categoryRepository.listByParent(id)
    const childCounts = await Promise.all(
      children.map((child) => categoryService.getItemCount(child.id, { includeDescendants: true })),
    )
    return direct.length + childCounts.reduce((sum, count) => sum + count, 0)
  },

  createCategory: async (input: NewCategoryInput): Promise<Category> => {
    const name = input.name.trim()
    if (!name) throw new ValidationError('Category name is required.')
    const now = new Date().toISOString()
    const category: Category = {
      id: crypto.randomUUID(),
      name,
      icon: input.icon?.trim() ?? '',
      parentId: input.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await categoryRepository.save(category)
    changeBus.emit('category')
    return category
  },

  updateCategory: async (id: string, input: UpdateCategoryInput): Promise<Category> => {
    const existing = await categoryRepository.get(id)
    if (!existing) throw new NotFoundError('Category not found.')

    const nextParentId = input.parentId === undefined ? existing.parentId : input.parentId
    if (nextParentId !== null) {
      if (nextParentId === id) {
        throw new ValidationError('A category cannot be its own parent.')
      }
      if (await wouldCreateCycle(id, nextParentId)) {
        throw new ValidationError('This would create a category loop.')
      }
    }

    const name = input.name !== undefined ? input.name.trim() : existing.name
    if (!name) throw new ValidationError('Category name is required.')

    const updated: Category = {
      ...existing,
      name,
      icon: input.icon !== undefined ? input.icon.trim() : existing.icon,
      parentId: nextParentId,
      updatedAt: new Date().toISOString(),
    }
    await categoryRepository.save(updated)
    changeBus.emit('category')
    return updated
  },

  /** Throws if the category still has subcategories; caller must move or delete them first. */
  deleteCategory: async (id: string): Promise<void> => {
    const children = await categoryRepository.listByParent(id)
    if (children.length > 0) {
      throw new ConflictError('Move or delete this category’s subcategories first.')
    }
    await itemService.clearCategoryFromItems(id)
    await categoryRepository.remove(id)
    changeBus.emit('category')
  },
}
