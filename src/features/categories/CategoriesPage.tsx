import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { categoryService } from '../../services/categoryService'
import { ConflictError, ValidationError } from '../../services/errors'
import { itemService } from '../../services/itemService'
import type { Category } from '../../types/entities'
import { Button } from '../../ui/components/Button'
import { Card } from '../../ui/components/Card'
import { EmptyState } from '../../ui/components/EmptyState'
import { Modal } from '../../ui/components/Modal'
import { useLiveQuery } from '../shared/useLiveQuery'
import styles from './CategoriesPage.module.css'

interface EditingState {
  id?: string
  name: string
  icon: string
}

async function loadCategoriesData(categoryId: string | undefined) {
  const [current, children, directItems] = await Promise.all([
    categoryId ? categoryService.getCategory(categoryId) : Promise.resolve(undefined),
    categoryId ? categoryService.listChildren(categoryId) : categoryService.listRoots(),
    categoryId ? itemService.listItems().then((items) => items.filter((i) => i.categoryId === categoryId)) : Promise.resolve([]),
  ])
  const childCounts = await Promise.all(
    children.map((child) => categoryService.getItemCount(child.id, { includeDescendants: true })),
  )
  return {
    current,
    directItems,
    children: children.map((child, index) => ({ category: child, itemCount: childCounts[index] })),
  }
}

export function CategoriesPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const { data, loading, reload } = useLiveQuery(() => loadCategoriesData(categoryId), ['category', 'item'], [
    categoryId,
  ])
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [error, setError] = useState<string>()

  const openCreate = () => setEditing({ name: '', icon: '' })
  const openEdit = (category: Category) => setEditing({ id: category.id, name: category.name, icon: category.icon })
  const closeModal = () => {
    setEditing(null)
    setError(undefined)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setError(undefined)
    try {
      if (editing.id) {
        await categoryService.updateCategory(editing.id, { name: editing.name, icon: editing.icon })
      } else {
        await categoryService.createCategory({ name: editing.name, icon: editing.icon, parentId: categoryId ?? null })
      }
      closeModal()
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Speichern fehlgeschlagen.')
    }
  }

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`"${category.name}" wirklich löschen?`)) return
    try {
      await categoryService.deleteCategory(category.id)
      reload()
    } catch (err) {
      if (err instanceof ConflictError) {
        window.alert(err.message)
      } else {
        window.alert('Löschen fehlgeschlagen.')
      }
    }
  }

  if (loading) return <p>Lädt…</p>

  if (categoryId && !data?.current) {
    return (
      <div>
        <p>Diese Kategorie wurde nicht gefunden.</p>
        <Link to="/categories">Zurück zu Kategorien</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>
            {data?.current ? (
              <>
                <Link to="/categories" className={styles.backLink}>
                  Kategorien
                </Link>{' '}
                › {data.current.icon} {data.current.name}
              </>
            ) : (
              'Kategorien'
            )}
          </h1>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Neue Kategorie
        </Button>
      </header>

      {data && data.children.length === 0 && data.directItems.length === 0 && (
        <EmptyState
          icon={<span>🏷️</span>}
          title={categoryId ? 'Diese Kategorie ist noch leer.' : 'Noch keine Kategorien angelegt.'}
          description="Kategorien helfen dir, Gegenstände wie Werkzeug oder Dekoration zu gruppieren."
        />
      )}

      <div className={styles.grid}>
        {data?.children.map(({ category, itemCount }) => (
          <Card key={category.id} className={styles.categoryCard}>
            <Link to={`/categories/${category.id}`} className={styles.categoryLink}>
              <p className={styles.categoryName}>
                {category.icon} {category.name}
              </p>
              <p className={styles.categoryMeta}>
                {itemCount} {itemCount === 1 ? 'Gegenstand' : 'Gegenstände'}
              </p>
            </Link>
            <div className={styles.cardActions}>
              <button type="button" onClick={() => openEdit(category)} aria-label={`${category.name} bearbeiten`}>
                ✎
              </button>
              <button type="button" onClick={() => handleDelete(category)} aria-label={`${category.name} löschen`}>
                🗑
              </button>
            </div>
          </Card>
        ))}
      </div>

      {data && data.directItems.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Gegenstände direkt hier</h2>
          <div className={styles.itemList}>
            {data.directItems.map((item) => (
              <Link key={item.id} to={`/inventory/${item.id}`} className={styles.itemLink}>
                {item.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <Modal open={editing !== null} title={editing?.id ? 'Kategorie bearbeiten' : 'Neue Kategorie'} onClose={closeModal}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <label className={styles.field}>
            <span>Name *</span>
            <input
              required
              autoFocus
              value={editing?.name ?? ''}
              onChange={(e) => setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
            />
          </label>
          <label className={styles.field}>
            <span>Icon (Emoji, optional)</span>
            <input
              value={editing?.icon ?? ''}
              maxLength={4}
              onChange={(e) => setEditing((prev) => (prev ? { ...prev, icon: e.target.value } : prev))}
              placeholder="🔧"
            />
          </label>
          <div className={styles.formActions}>
            <Button type="button" variant="ghost" onClick={closeModal}>
              Abbrechen
            </Button>
            <Button type="submit" variant="primary">
              Speichern
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
