import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetConnectionForTests } from '../db/connection'
import { exportService } from './exportService'
import { ImportError } from './errors'
import { itemService } from './itemService'
import { locationService } from './locationService'
import { applyBackup, buildBackupPreview, parseBackup } from './importService'
import { photoService } from './photoService'
import { createZipBlob } from './zip'

function toFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: 'application/zip' })
}

beforeEach(() => {
  resetConnectionForTests()
  indexedDB = new IDBFactory()
})

describe('export / import round trip', () => {
  it('restores items, locations, and photos into an empty database', async () => {
    const keller = await locationService.createLocation({ name: 'Keller' })
    const item = await itemService.createItem({ name: 'Bohrmaschine', locationId: keller.id })
    await photoService.addPhoto(item.id, new File(['img-bytes'], 'a.jpg', { type: 'image/jpeg' }))

    const { blob } = await exportService.createBackup()

    // simulate importing into a fresh database
    resetConnectionForTests()
    indexedDB = new IDBFactory()

    const parsed = await parseBackup(toFile(blob, 'backup.zip'))
    const preview = await buildBackupPreview(parsed)
    expect(preview.counts).toEqual({ items: 1, locations: 1, categories: 0, tags: 0, photos: 1, documents: 0 })
    expect(preview.conflicts.items).toBe(0)

    const summary = await applyBackup(parsed, 'skip')
    expect(summary.imported.items).toBe(1)
    expect(summary.imported.locations).toBe(1)
    expect(summary.imported.photos).toBe(1)
    expect(summary.missingFiles).toEqual([])

    const restoredItem = await itemService.getItem(item.id)
    expect(restoredItem?.name).toBe('Bohrmaschine')
    expect(await photoService.listByItem(item.id)).toHaveLength(1)
  })

  it('skips conflicting records by default and overwrites when asked', async () => {
    const item = await itemService.createItem({ name: 'Original' })
    const { blob } = await exportService.createBackup()

    await itemService.updateItem(item.id, { name: 'Geändert lokal' })

    const parsed = await parseBackup(toFile(blob, 'backup.zip'))
    const preview = await buildBackupPreview(parsed)
    expect(preview.conflicts.items).toBe(1)

    const skipSummary = await applyBackup(parsed, 'skip')
    expect(skipSummary.skipped.items).toBe(1)
    expect((await itemService.getItem(item.id))?.name).toBe('Geändert lokal')

    const overwriteSummary = await applyBackup(parsed, 'overwrite')
    expect(overwriteSummary.imported.items).toBe(1)
    expect((await itemService.getItem(item.id))?.name).toBe('Original')
  })

  it('reports missing binary files instead of failing the whole import', async () => {
    const dataJson = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      items: [],
      locations: [],
      categories: [],
      tags: [],
      photos: [{ id: 'p1', itemId: 'item-1', filename: 'lost.jpg', mimeType: 'image/jpeg', createdAt: '' }],
      documents: [],
    }
    const zip = await createZipBlob([
      { path: 'data.json', data: new Blob([JSON.stringify(dataJson)], { type: 'application/json' }) },
    ])

    const parsed = await parseBackup(toFile(zip, 'backup.zip'))
    const summary = await applyBackup(parsed, 'skip')
    expect(summary.missingFiles).toEqual(['photos/p1-lost.jpg'])
    expect(summary.imported.photos).toBe(0)
  })
})

describe('parseBackup validation', () => {
  it('rejects a ZIP without data.json', async () => {
    const zip = await createZipBlob([{ path: 'nope.txt', data: new Blob(['x']) }])
    await expect(parseBackup(toFile(zip, 'backup.zip'))).rejects.toThrow(ImportError)
  })

  it('rejects malformed JSON', async () => {
    const zip = await createZipBlob([{ path: 'data.json', data: new Blob(['not json']) }])
    await expect(parseBackup(toFile(zip, 'backup.zip'))).rejects.toThrow(ImportError)
  })

  it('rejects a data.json missing required arrays', async () => {
    const zip = await createZipBlob([
      { path: 'data.json', data: new Blob([JSON.stringify({ schemaVersion: 1, items: [] })]) },
    ])
    await expect(parseBackup(toFile(zip, 'backup.zip'))).rejects.toThrow(ImportError)
  })

  it('rejects items missing required fields', async () => {
    const dataJson = {
      schemaVersion: 1,
      exportedAt: '',
      items: [{ id: 'x' }],
      locations: [],
      categories: [],
      tags: [],
      photos: [],
      documents: [],
    }
    const zip = await createZipBlob([{ path: 'data.json', data: new Blob([JSON.stringify(dataJson)]) }])
    await expect(parseBackup(toFile(zip, 'backup.zip'))).rejects.toThrow(ImportError)
  })

  it('rejects an unsupported schema version', async () => {
    const dataJson = {
      schemaVersion: 99,
      exportedAt: '',
      items: [],
      locations: [],
      categories: [],
      tags: [],
      photos: [],
      documents: [],
    }
    const zip = await createZipBlob([{ path: 'data.json', data: new Blob([JSON.stringify(dataJson)]) }])
    await expect(parseBackup(toFile(zip, 'backup.zip'))).rejects.toThrow(ImportError)
  })

  it('rejects a file that is not a ZIP at all', async () => {
    const notZip = new File(['plain text'], 'backup.zip', { type: 'application/zip' })
    await expect(parseBackup(notZip)).rejects.toThrow(ImportError)
  })
})
