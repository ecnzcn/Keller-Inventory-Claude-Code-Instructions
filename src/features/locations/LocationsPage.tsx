import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConflictError, ValidationError } from '../../services/errors'
import { itemService } from '../../services/itemService'
import { locationService } from '../../services/locationService'
import type { Location } from '../../types/entities'
import { Button } from '../../ui/components/Button'
import { Card } from '../../ui/components/Card'
import { EmptyState } from '../../ui/components/EmptyState'
import { Modal } from '../../ui/components/Modal'
import { useLiveQuery } from '../shared/useLiveQuery'
import styles from './LocationsPage.module.css'

interface EditingState {
  id?: string
  name: string
  description: string
}

async function loadLocationsData(locationId: string | undefined) {
  const [current, children, breadcrumb, directItems] = await Promise.all([
    locationId ? locationService.getLocation(locationId) : Promise.resolve(undefined),
    locationId ? locationService.listChildren(locationId) : locationService.listRoots(),
    locationId ? locationService.getAncestors(locationId) : Promise.resolve([]),
    locationId ? itemService.listItems().then((items) => items.filter((i) => i.locationId === locationId)) : Promise.resolve([]),
  ])
  const childCounts = await Promise.all(
    children.map((child) => locationService.getItemCount(child.id, { includeDescendants: true })),
  )
  return {
    current,
    breadcrumb,
    directItems,
    children: children.map((child, index) => ({ location: child, itemCount: childCounts[index] })),
  }
}

export function LocationsPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const { data, loading, reload } = useLiveQuery(() => loadLocationsData(locationId), ['location', 'item'], [
    locationId,
  ])
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [error, setError] = useState<string>()

  const openCreate = () => setEditing({ name: '', description: '' })
  const openEdit = (location: Location) => setEditing({ id: location.id, name: location.name, description: location.description })
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
        await locationService.updateLocation(editing.id, { name: editing.name, description: editing.description })
      } else {
        await locationService.createLocation({
          name: editing.name,
          description: editing.description,
          parentId: locationId ?? null,
        })
      }
      closeModal()
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Speichern fehlgeschlagen.')
    }
  }

  const handleDelete = async (location: Location) => {
    if (!window.confirm(`"${location.name}" wirklich löschen?`)) return
    try {
      await locationService.deleteLocation(location.id)
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

  if (locationId && !data?.current) {
    return (
      <div>
        <p>Dieser Ort wurde nicht gefunden.</p>
        <Link to="/locations">Zurück zu Orten</Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Orte</h1>
          <nav className={styles.breadcrumb} aria-label="Pfad">
            <Link to="/locations">Alle Orte</Link>
            {data?.breadcrumb.map((ancestor) => (
              <span key={ancestor.id}>
                {' '}
                › <Link to={`/locations/${ancestor.id}`}>{ancestor.name}</Link>
              </span>
            ))}
            {data?.current && <span> › {data.current.name}</span>}
          </nav>
        </div>
        <Button variant="primary" onClick={openCreate}>
          + Neuer Ort
        </Button>
      </header>

      {data && data.children.length === 0 && data.directItems.length === 0 && (
        <EmptyState
          icon={<span>📍</span>}
          title={locationId ? 'Dieser Ort ist noch leer.' : 'Noch keine Orte angelegt.'}
          description="Lege Orte an, um deine Gegenstände zu organisieren, z. B. Keller, Regal 3, Fach B."
        />
      )}

      <div className={styles.grid}>
        {data?.children.map(({ location, itemCount }) => (
          <Card key={location.id} className={styles.locationCard}>
            <Link to={`/locations/${location.id}`} className={styles.locationLink}>
              <p className={styles.locationName}>{location.name}</p>
              <p className={styles.locationMeta}>
                {itemCount} {itemCount === 1 ? 'Gegenstand' : 'Gegenstände'}
              </p>
            </Link>
            <div className={styles.cardActions}>
              <button type="button" onClick={() => openEdit(location)} aria-label={`${location.name} bearbeiten`}>
                ✎
              </button>
              <button type="button" onClick={() => handleDelete(location)} aria-label={`${location.name} löschen`}>
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

      <Modal open={editing !== null} title={editing?.id ? 'Ort bearbeiten' : 'Neuer Ort'} onClose={closeModal}>
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
            <span>Beschreibung</span>
            <textarea
              rows={2}
              value={editing?.description ?? ''}
              onChange={(e) => setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
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
