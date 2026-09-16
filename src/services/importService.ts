import { categoryRepository } from '../repository/categoryRepository'
import { documentRepository } from '../repository/documentRepository'
import { itemRepository } from '../repository/itemRepository'
import { locationRepository } from '../repository/locationRepository'
import { photoRepository } from '../repository/photoRepository'
import { tagRepository } from '../repository/tagRepository'
import type { AppDocument, Category, Item, Location, Photo, Tag } from '../types/entities'
import { changeBus } from './changeBus'
import { documentPath, photoPath } from './exportService'
import { ImportError } from './errors'
import { readZipEntries } from './zip'

interface BackupPhotoMeta {
  id: string
  itemId: string
  filename: string
  mimeType: string
  createdAt: string
}

interface BackupDocumentMeta extends BackupPhotoMeta {
  size: number
}

export interface ParsedBackup {
  schemaVersion: number
  exportedAt: string
  items: Item[]
  locations: Location[]
  categories: Category[]
  tags: Tag[]
  photoMetas: BackupPhotoMeta[]
  documentMetas: BackupDocumentMeta[]
  blobsByPath: Map<string, Blob>
}

export interface BackupPreview {
  exportedAt: string
  counts: {
    items: number
    locations: number
    categories: number
    tags: number
    photos: number
    documents: number
  }
  conflicts: {
    items: number
    locations: number
    categories: number
    tags: number
    photos: number
    documents: number
  }
}

export interface ImportSummary {
  imported: BackupPreview['counts']
  skipped: BackupPreview['counts']
  missingFiles: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertArray(value: unknown, field: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new ImportError(`Ungültige Sicherung: "${field}" fehlt oder ist kein Array.`)
  }
}

function assertHasStringFields(value: unknown, fields: string[], entityLabel: string): void {
  if (!isRecord(value)) {
    throw new ImportError(`Ungültige Sicherung: ein Eintrag unter "${entityLabel}" ist kein Objekt.`)
  }
  for (const field of fields) {
    if (typeof value[field] !== 'string') {
      throw new ImportError(`Ungültige Sicherung: "${entityLabel}" fehlt das Feld "${field}".`)
    }
  }
}

/** Reads and structurally validates a Keller backup ZIP without writing anything to the database. */
export async function parseBackup(file: File): Promise<ParsedBackup> {
  let zipEntries
  try {
    zipEntries = await readZipEntries(file)
  } catch (err) {
    throw new ImportError(err instanceof Error ? err.message : 'Datei konnte nicht gelesen werden.')
  }

  const dataEntry = zipEntries.find((entry) => entry.path === 'data.json')
  if (!dataEntry) {
    throw new ImportError('Ungültige Sicherung: "data.json" fehlt im Archiv.')
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(await dataEntry.data.text())
  } catch {
    throw new ImportError('Ungültige Sicherung: "data.json" enthält kein gültiges JSON.')
  }

  if (!isRecord(parsedJson)) {
    throw new ImportError('Ungültige Sicherung: "data.json" hat ein unerwartetes Format.')
  }
  if (parsedJson.schemaVersion !== 1) {
    throw new ImportError('Diese Sicherung wurde mit einer nicht unterstützten Version erstellt.')
  }

  const { items, locations, categories, tags, photos, documents } = parsedJson
  assertArray(items, 'items')
  assertArray(locations, 'locations')
  assertArray(categories, 'categories')
  assertArray(tags, 'tags')
  assertArray(photos, 'photos')
  assertArray(documents, 'documents')

  for (const item of items) assertHasStringFields(item, ['id', 'name'], 'items')
  for (const location of locations) assertHasStringFields(location, ['id', 'name'], 'locations')
  for (const category of categories) assertHasStringFields(category, ['id', 'name'], 'categories')
  for (const tag of tags) assertHasStringFields(tag, ['id', 'name'], 'tags')
  for (const photo of photos) assertHasStringFields(photo, ['id', 'itemId', 'filename'], 'photos')
  for (const document of documents) assertHasStringFields(document, ['id', 'itemId', 'filename'], 'documents')

  const blobsByPath = new Map(zipEntries.map((entry) => [entry.path, entry.data]))

  return {
    schemaVersion: parsedJson.schemaVersion,
    exportedAt: typeof parsedJson.exportedAt === 'string' ? parsedJson.exportedAt : '',
    items: items as Item[],
    locations: locations as Location[],
    categories: categories as Category[],
    tags: tags as Tag[],
    photoMetas: photos as BackupPhotoMeta[],
    documentMetas: documents as BackupDocumentMeta[],
    blobsByPath,
  }
}

export async function buildBackupPreview(parsed: ParsedBackup): Promise<BackupPreview> {
  const [existingItems, existingLocations, existingCategories, existingTags, existingPhotos, existingDocuments] =
    await Promise.all([
      itemRepository.list(),
      locationRepository.list(),
      categoryRepository.list(),
      tagRepository.list(),
      photoRepository.list(),
      documentRepository.list(),
    ])

  const countConflicts = <T extends { id: string }>(incoming: T[], existing: T[]): number => {
    const existingIds = new Set(existing.map((e) => e.id))
    return incoming.filter((item) => existingIds.has(item.id)).length
  }

  return {
    exportedAt: parsed.exportedAt,
    counts: {
      items: parsed.items.length,
      locations: parsed.locations.length,
      categories: parsed.categories.length,
      tags: parsed.tags.length,
      photos: parsed.photoMetas.length,
      documents: parsed.documentMetas.length,
    },
    conflicts: {
      items: countConflicts(parsed.items, existingItems),
      locations: countConflicts(parsed.locations, existingLocations),
      categories: countConflicts(parsed.categories, existingCategories),
      tags: countConflicts(parsed.tags, existingTags),
      photos: countConflicts(parsed.photoMetas, existingPhotos),
      documents: countConflicts(parsed.documentMetas, existingDocuments),
    },
  }
}

export type ConflictResolution = 'skip' | 'overwrite'

export async function applyBackup(parsed: ParsedBackup, onConflict: ConflictResolution): Promise<ImportSummary> {
  const zero = { items: 0, locations: 0, categories: 0, tags: 0, photos: 0, documents: 0 }
  const imported = { ...zero }
  const skipped = { ...zero }
  const missingFiles: string[] = []

  async function upsertAll<T extends { id: string }>(
    entities: T[],
    getExisting: (id: string) => Promise<T | undefined>,
    save: (entity: T) => Promise<void>,
    key: keyof typeof zero,
  ) {
    for (const entity of entities) {
      const existing = await getExisting(entity.id)
      if (existing && onConflict === 'skip') {
        skipped[key] += 1
        continue
      }
      await save(entity)
      imported[key] += 1
    }
  }

  await upsertAll(parsed.locations, locationRepository.get, locationRepository.save, 'locations')
  await upsertAll(parsed.categories, categoryRepository.get, categoryRepository.save, 'categories')
  await upsertAll(parsed.tags, tagRepository.get, tagRepository.save, 'tags')
  await upsertAll(parsed.items, itemRepository.get, itemRepository.save, 'items')

  for (const meta of parsed.photoMetas) {
    const existing = await photoRepository.get(meta.id)
    if (existing && onConflict === 'skip') {
      skipped.photos += 1
      continue
    }
    const path = photoPath(meta.id, meta.filename)
    const data = parsed.blobsByPath.get(path)
    if (!data) {
      missingFiles.push(path)
      continue
    }
    const photo: Photo = { ...meta, data }
    await photoRepository.save(photo)
    imported.photos += 1
  }

  for (const meta of parsed.documentMetas) {
    const existing = await documentRepository.get(meta.id)
    if (existing && onConflict === 'skip') {
      skipped.documents += 1
      continue
    }
    const path = documentPath(meta.id, meta.filename)
    const data = parsed.blobsByPath.get(path)
    if (!data) {
      missingFiles.push(path)
      continue
    }
    const document: AppDocument = { ...meta, data }
    await documentRepository.save(document)
    imported.documents += 1
  }

  changeBus.emit('item')
  changeBus.emit('location')
  changeBus.emit('category')
  changeBus.emit('tag')
  changeBus.emit('photo')
  changeBus.emit('document')

  return { imported, skipped, missingFiles }
}

export const importService = { parseBackup, buildBackupPreview, applyBackup }
