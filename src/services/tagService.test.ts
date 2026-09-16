import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetConnectionForTests } from '../db/connection'
import { tagService } from './tagService'

beforeEach(() => {
  resetConnectionForTests()
  indexedDB = new IDBFactory()
})

describe('tagService.resolveTagIds', () => {
  it('creates new tags and returns their ids', async () => {
    const ids = await tagService.resolveTagIds(['Outdoor', 'Werkzeug'])
    expect(ids).toHaveLength(2)
    const tags = await tagService.listTags()
    expect(tags.map((t) => t.name).sort()).toEqual(['Outdoor', 'Werkzeug'])
  })

  it('reuses an existing tag case-insensitively instead of duplicating it', async () => {
    const [firstId] = await tagService.resolveTagIds(['Outdoor'])
    const [secondId] = await tagService.resolveTagIds(['outdoor'])

    expect(secondId).toBe(firstId)
    expect(await tagService.listTags()).toHaveLength(1)
  })

  it('trims whitespace and drops empty entries', async () => {
    const ids = await tagService.resolveTagIds(['  Outdoor  ', '', '   '])
    expect(ids).toHaveLength(1)
    expect((await tagService.listTags())[0].name).toBe('Outdoor')
  })

  it('deduplicates repeated names within the same call', async () => {
    const ids = await tagService.resolveTagIds(['Outdoor', 'Outdoor'])
    expect(ids).toHaveLength(1)
  })
})
