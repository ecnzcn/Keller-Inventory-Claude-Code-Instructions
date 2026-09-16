import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetConnectionForTests } from '../db/connection'
import { ValidationError } from './errors'
import { photoService } from './photoService'

beforeEach(() => {
  resetConnectionForTests()
  indexedDB = new IDBFactory()
})

describe('photoService', () => {
  it('stores an image and lists it for the item', async () => {
    const file = new File(['fake-image-bytes'], 'bohrmaschine.jpg', { type: 'image/jpeg' })
    const photo = await photoService.addPhoto('item-1', file)

    expect(photo.filename).toBe('bohrmaschine.jpg')
    const photos = await photoService.listByItem('item-1')
    expect(photos.map((p) => p.id)).toEqual([photo.id])
  })

  it('rejects non-image files', async () => {
    const file = new File(['not an image'], 'manual.pdf', { type: 'application/pdf' })
    await expect(photoService.addPhoto('item-1', file)).rejects.toThrow(ValidationError)
  })

  it('deletes a photo', async () => {
    const file = new File(['fake-image-bytes'], 'a.jpg', { type: 'image/jpeg' })
    const photo = await photoService.addPhoto('item-1', file)
    await photoService.deletePhoto(photo.id)
    expect(await photoService.listByItem('item-1')).toHaveLength(0)
  })
})
