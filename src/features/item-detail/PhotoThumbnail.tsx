import { useEffect, useState } from 'react'
import type { Photo } from '../../types/entities'
import styles from './PhotoSection.module.css'

export function PhotoThumbnail({ photo, onDelete }: { photo: Photo; onDelete: (photo: Photo) => void }) {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    const objectUrl = URL.createObjectURL(photo.data)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [photo.data])

  return (
    <div className={styles.thumbnail}>
      {url && <img src={url} alt={photo.filename} loading="lazy" />}
      <button
        type="button"
        className={styles.deleteButton}
        onClick={() => onDelete(photo)}
        aria-label={`Foto "${photo.filename}" löschen`}
      >
        ×
      </button>
    </div>
  )
}
