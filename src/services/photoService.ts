import { photoRepository } from '../repository/photoRepository'
import type { Photo } from '../types/entities'
import { changeBus } from './changeBus'
import { ValidationError } from './errors'

const MAX_PHOTO_BYTES = 25 * 1024 * 1024 // 25 MB

export const photoService = {
  listByItem: (itemId: string): Promise<Photo[]> => photoRepository.listByItem(itemId),

  addPhoto: async (itemId: string, file: File): Promise<Photo> => {
    if (!file.type.startsWith('image/')) {
      throw new ValidationError(`"${file.name}" ist kein unterstütztes Bildformat.`)
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new ValidationError(`"${file.name}" ist zu groß (max. 25 MB).`)
    }
    const photo: Photo = {
      id: crypto.randomUUID(),
      itemId,
      filename: file.name,
      mimeType: file.type,
      data: file,
      createdAt: new Date().toISOString(),
    }
    await photoRepository.save(photo)
    changeBus.emit('photo')
    return photo
  },

  deletePhoto: async (id: string): Promise<void> => {
    await photoRepository.remove(id)
    changeBus.emit('photo')
  },
}
