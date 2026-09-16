import { documentRepository } from '../repository/documentRepository'
import type { AppDocument } from '../types/entities'
import { changeBus } from './changeBus'
import { ValidationError } from './errors'

const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024 // 50 MB

export const documentService = {
  listByItem: (itemId: string): Promise<AppDocument[]> => documentRepository.listByItem(itemId),

  addDocument: async (itemId: string, file: File): Promise<AppDocument> => {
    if (file.size === 0) {
      throw new ValidationError(`"${file.name}" ist leer und wurde nicht hinzugefügt.`)
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new ValidationError(`"${file.name}" ist zu groß (max. 50 MB).`)
    }
    const document: AppDocument = {
      id: crypto.randomUUID(),
      itemId,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      data: file,
      createdAt: new Date().toISOString(),
    }
    await documentRepository.save(document)
    changeBus.emit('document')
    return document
  },

  deleteDocument: async (id: string): Promise<void> => {
    await documentRepository.remove(id)
    changeBus.emit('document')
  },
}
