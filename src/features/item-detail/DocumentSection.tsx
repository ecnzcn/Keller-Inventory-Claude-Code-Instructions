import { useRef, useState, type ChangeEvent } from 'react'
import { documentService } from '../../services/documentService'
import { ValidationError } from '../../services/errors'
import type { AppDocument } from '../../types/entities'
import { formatBytes } from '../../ui/format'
import { useLiveQuery } from '../shared/useLiveQuery'
import styles from './DocumentSection.module.css'

function openDocument(doc: AppDocument) {
  const url = URL.createObjectURL(doc.data)
  window.open(url, '_blank', 'noopener,noreferrer')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function DocumentSection({ itemId }: { itemId: string }) {
  const { data: documents, reload } = useLiveQuery(
    () => documentService.listByItem(itemId),
    ['document'],
    [itemId],
  )
  const [error, setError] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setError(undefined)
    for (const file of files) {
      try {
        await documentService.addDocument(itemId, file)
      } catch (err) {
        setError(err instanceof ValidationError ? err.message : 'Dokument konnte nicht hinzugefügt werden.')
      }
    }
    reload()
  }

  const handleDelete = async (doc: AppDocument) => {
    await documentService.deleteDocument(doc.id)
    reload()
  }

  return (
    <section>
      <div className={styles.header}>
        <h2 className={styles.title}>Dokumente</h2>
        <button type="button" className={styles.addButton} onClick={() => inputRef.current?.click()}>
          + Dokument
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx"
          multiple
          hidden
          onChange={handleFiles}
          aria-label="Dokument hinzufügen"
        />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {documents && documents.length > 0 ? (
        <ul className={styles.list}>
          {documents.map((doc) => (
            <li key={doc.id} className={styles.row}>
              <button type="button" className={styles.openButton} onClick={() => openDocument(doc)}>
                <span className={styles.filename}>{doc.filename}</span>
                <span className={styles.meta}>
                  {doc.mimeType || 'Datei'} · {formatBytes(doc.size)}
                </span>
              </button>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => handleDelete(doc)}
                aria-label={`"${doc.filename}" löschen`}
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Keine Dokumente vorhanden.</p>
      )}
    </section>
  )
}
