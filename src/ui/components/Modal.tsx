import { useEffect, useRef, type ReactNode } from 'react'
import styles from './Modal.module.css'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** Thin wrapper around the native <dialog> element: free focus trapping, Esc-to-close, and a backdrop. */
export function Modal({ open, title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} onCancel={onClose}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Schließen">
          ×
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </dialog>
  )
}
