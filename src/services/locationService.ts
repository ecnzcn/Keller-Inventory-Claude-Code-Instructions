import { itemRepository } from '../repository/itemRepository'
import { locationRepository } from '../repository/locationRepository'
import type { Location, NewLocationInput, UpdateLocationInput } from '../types/entities'
import { changeBus } from './changeBus'
import { ConflictError, NotFoundError, ValidationError } from './errors'
import { itemService } from './itemService'

async function wouldCreateCycle(id: string, newParentId: string | null): Promise<boolean> {
  let currentId = newParentId
  while (currentId !== null) {
    if (currentId === id) return true
    const current = await locationRepository.get(currentId)
    currentId = current?.parentId ?? null
  }
  return false
}

export const locationService = {
  listAll: (): Promise<Location[]> => locationRepository.list(),

  listRoots: (): Promise<Location[]> => locationRepository.listByParent(null),

  listChildren: (parentId: string): Promise<Location[]> => locationRepository.listByParent(parentId),

  getLocation: (id: string): Promise<Location | undefined> => locationRepository.get(id),

  getAncestors: async (id: string): Promise<Location[]> => {
    const ancestors: Location[] = []
    let current = await locationRepository.get(id)
    while (current?.parentId) {
      const parent = await locationRepository.get(current.parentId)
      if (!parent) break
      ancestors.unshift(parent)
      current = parent
    }
    return ancestors
  },

  getPath: async (id: string): Promise<Location[]> => {
    const location = await locationRepository.get(id)
    if (!location) return []
    const ancestors = await locationService.getAncestors(id)
    return [...ancestors, location]
  },

  getItemCount: async (id: string, options: { includeDescendants?: boolean } = {}): Promise<number> => {
    const direct = await itemRepository.listByLocation(id)
    if (!options.includeDescendants) return direct.length
    const children = await locationRepository.listByParent(id)
    const childCounts = await Promise.all(
      children.map((child) => locationService.getItemCount(child.id, { includeDescendants: true })),
    )
    return direct.length + childCounts.reduce((sum, count) => sum + count, 0)
  },

  createLocation: async (input: NewLocationInput): Promise<Location> => {
    const name = input.name.trim()
    if (!name) throw new ValidationError('Location name is required.')
    const now = new Date().toISOString()
    const location: Location = {
      id: crypto.randomUUID(),
      name,
      parentId: input.parentId ?? null,
      description: input.description?.trim() ?? '',
      createdAt: now,
      updatedAt: now,
    }
    await locationRepository.save(location)
    changeBus.emit('location')
    return location
  },

  updateLocation: async (id: string, input: UpdateLocationInput): Promise<Location> => {
    const existing = await locationRepository.get(id)
    if (!existing) throw new NotFoundError('Location not found.')

    const nextParentId = input.parentId === undefined ? existing.parentId : input.parentId
    if (nextParentId !== null) {
      if (nextParentId === id) {
        throw new ValidationError('A location cannot be its own parent.')
      }
      if (await wouldCreateCycle(id, nextParentId)) {
        throw new ValidationError('This would create a location loop.')
      }
    }

    const name = input.name !== undefined ? input.name.trim() : existing.name
    if (!name) throw new ValidationError('Location name is required.')

    const updated: Location = {
      ...existing,
      name,
      parentId: nextParentId,
      description: input.description !== undefined ? input.description.trim() : existing.description,
      updatedAt: new Date().toISOString(),
    }
    await locationRepository.save(updated)
    changeBus.emit('location')
    return updated
  },

  /** Throws if the location still has child locations; caller must move or delete them first. */
  deleteLocation: async (id: string): Promise<void> => {
    const children = await locationRepository.listByParent(id)
    if (children.length > 0) {
      throw new ConflictError('Move or delete this location’s sub-locations first.')
    }
    await itemService.clearLocationFromItems(id)
    await locationRepository.remove(id)
    changeBus.emit('location')
  },
}
