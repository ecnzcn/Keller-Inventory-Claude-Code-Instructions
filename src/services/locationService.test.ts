import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetConnectionForTests } from '../db/connection'
import { ConflictError, ValidationError } from './errors'
import { itemService } from './itemService'
import { locationService } from './locationService'

beforeEach(() => {
  resetConnectionForTests()
  indexedDB = new IDBFactory()
})

describe('locationService hierarchy', () => {
  it('builds a Keller -> Regal 3 -> Fach B hierarchy and resolves ancestors', async () => {
    const keller = await locationService.createLocation({ name: 'Keller' })
    const regal = await locationService.createLocation({ name: 'Regal 3', parentId: keller.id })
    const fach = await locationService.createLocation({ name: 'Fach B', parentId: regal.id })

    expect(await locationService.listRoots()).toEqual([keller])
    expect(await locationService.listChildren(keller.id)).toEqual([regal])

    const ancestors = await locationService.getAncestors(fach.id)
    expect(ancestors.map((l) => l.name)).toEqual(['Keller', 'Regal 3'])

    const path = await locationService.getPath(fach.id)
    expect(path.map((l) => l.name)).toEqual(['Keller', 'Regal 3', 'Fach B'])
  })

  it('rejects reparenting a location under its own descendant', async () => {
    const keller = await locationService.createLocation({ name: 'Keller' })
    const regal = await locationService.createLocation({ name: 'Regal 3', parentId: keller.id })

    await expect(locationService.updateLocation(keller.id, { parentId: regal.id })).rejects.toThrow(
      ValidationError,
    )
  })

  it('rejects a location becoming its own parent', async () => {
    const keller = await locationService.createLocation({ name: 'Keller' })
    await expect(locationService.updateLocation(keller.id, { parentId: keller.id })).rejects.toThrow(
      ValidationError,
    )
  })

  it('counts items directly and including descendants', async () => {
    const keller = await locationService.createLocation({ name: 'Keller' })
    const regal = await locationService.createLocation({ name: 'Regal 3', parentId: keller.id })
    await itemService.createItem({ name: 'Bohrmaschine', locationId: keller.id })
    await itemService.createItem({ name: 'Akkuschrauber', locationId: regal.id })

    expect(await locationService.getItemCount(keller.id)).toBe(1)
    expect(await locationService.getItemCount(keller.id, { includeDescendants: true })).toBe(2)
  })

  it('refuses to delete a location that still has children', async () => {
    const keller = await locationService.createLocation({ name: 'Keller' })
    await locationService.createLocation({ name: 'Regal 3', parentId: keller.id })

    await expect(locationService.deleteLocation(keller.id)).rejects.toThrow(ConflictError)
  })

  it('clears the location reference on items when the location is deleted', async () => {
    const keller = await locationService.createLocation({ name: 'Keller' })
    const item = await itemService.createItem({ name: 'Bohrmaschine', locationId: keller.id })

    await locationService.deleteLocation(keller.id)

    const updated = await itemService.getItem(item.id)
    expect(updated?.locationId).toBeNull()
  })
})
