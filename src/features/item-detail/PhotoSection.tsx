import { useRef, useState, type ChangeEvent } from 'react'
import { ValidationError } from '../../services/errors'
import { photoService } from '../../services/photoService'
import type { Photo } from '../../types/entities'
import { useLiveQuery } from '../shared/useLiveQuery'
import { PhotoThumbnail } from './PhotoThumbnail'
import styles from './PhotoSection.module.css'

export function PhotoSection({ itemId }: { itemId: string }) {
  const { data: photos, reload } = useLiveQuery(() => photoService.listByItem(itemId), ['photo'], [itemId])
  const [error, setError] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setError(undefined)
    for (const file of files) {
      try {
        await photoService.addPhoto(itemId, file)
      } catch (err) {
        setError(err instanceof ValidationError ? err.message : 'Foto konnte nicht hinzugefügt werden.')
      }
    }
    reload()
  }

  const handleDelete = async (photo: Photo) => {
    await photoService.deletePhoto(photo.id)
    reload()
  }

  return (
    <section>
      <div className={styles.header}>
        <h2 className={styles.title}>Fotos</h2>
        <button type="button" className={styles.addButton} onClick={() => inputRef.current?.click()}>
          + Foto
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFiles}
          aria-label="Foto hinzufügen"
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {photos && photos.length > 0 ? (
        <div className={styles.grid}>
          {photos.map((photo) => (
            <PhotoThumbnail key={photo.id} photo={photo} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Noch keine Fotos.</p>
      )}
    </section>
  )
}
