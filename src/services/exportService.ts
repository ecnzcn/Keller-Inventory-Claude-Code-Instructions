import { categoryRepository } from '../repository/categoryRepository'
import { documentRepository } from '../repository/documentRepository'
import { itemRepository } from '../repository/itemRepository'
import { locationRepository } from '../repository/locationRepository'
import { photoRepository } from '../repository/photoRepository'
import { tagRepository } from '../repository/tagRepository'
import { createZipBlob, type ZipEntryInput } from './zip'

export const BACKUP_SCHEMA_VERSION = 1

export function photoPath(id: string, filename: string): string {
  return `photos/${id}-${filename}`
}

export function documentPath(id: string, filename: string): string {
  return `documents/${id}-${filename}`
}

export function suggestedBackupFilename(date: Date = new Date()): string {
  const iso = date.toISOString().slice(0, 10)
  return `Keller-Backup-${iso}.zip`
}

export const exportService = {
  createBackup: async (): Promise<{ blob: Blob; filename: string }> => {
    const [items, locations, categories, tags, photos, documents] = await Promise.all([
      itemRepository.list(),
      locationRepository.list(),
      categoryRepository.list(),
      tagRepository.list(),
      photoRepository.list(),
      documentRepository.list(),
    ])

    const dataJson = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      items,
      locations,
      categories,
      tags,
      photos: photos.map(({ id, itemId, filename, mimeType, createdAt }) => ({
        id,
        itemId,
        filename,
        mimeType,
        createdAt,
      })),
      documents: documents.map(({ id, itemId, filename, mimeType, size, createdAt }) => ({
        id,
        itemId,
        filename,
        mimeType,
        size,
        createdAt,
      })),
    }

    const entries: ZipEntryInput[] = [
      { path: 'data.json', data: new Blob([JSON.stringify(dataJson, null, 2)], { type: 'application/json' }) },
      ...photos.map((photo) => ({ path: photoPath(photo.id, photo.filename), data: photo.data })),
      ...documents.map((doc) => ({ path: documentPath(doc.id, doc.filename), data: doc.data })),
    ]

    const blob = await createZipBlob(entries)
    return { blob, filename: suggestedBackupFilename() }
  },
}
