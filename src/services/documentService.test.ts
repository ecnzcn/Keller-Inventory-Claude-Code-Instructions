import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetConnectionForTests } from '../db/connection'
import { documentService } from './documentService'
import { ValidationError } from './errors'

beforeEach(() => {
  resetConnectionForTests()
  indexedDB = new IDBFactory()
})

describe('documentService', () => {
  it('stores a document and lists it for the item', async () => {
    const file = new File(['%PDF-1.4 fake content'], 'anleitung.pdf', { type: 'application/pdf' })
    const document = await documentService.addDocument('item-1', file)

    expect(document.filename).toBe('anleitung.pdf')
    expect(document.size).toBeGreaterThan(0)
    const documents = await documentService.listByItem('item-1')
    expect(documents.map((d) => d.id)).toEqual([document.id])
  })

  it('rejects empty files', async () => {
    const file = new File([], 'empty.pdf', { type: 'application/pdf' })
    await expect(documentService.addDocument('item-1', file)).rejects.toThrow(ValidationError)
  })

  it('deletes a document', async () => {
    const file = new File(['content'], 'a.txt', { type: 'text/plain' })
    const document = await documentService.addDocument('item-1', file)
    await documentService.deleteDocument(document.id)
    expect(await documentService.listByItem('item-1')).toHaveLength(0)
  })
})
