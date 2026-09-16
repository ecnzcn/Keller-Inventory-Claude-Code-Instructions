import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { categoryService } from '../../services/categoryService'
import { itemService } from '../../services/itemService'
import { locationService } from '../../services/locationService'
import { tagService } from '../../services/tagService'
import { Button } from '../../ui/components/Button'
import { formatCurrency, formatDate } from '../../ui/format'
import { useLiveQuery } from '../shared/useLiveQuery'
import { DocumentSection } from './DocumentSection'
import styles from './ItemDetailPage.module.css'
import { PhotoSection } from './PhotoSection'

async function loadItemDetail(itemId: string) {
  const item = await itemService.getItem(itemId)
  if (!item) return undefined
  const [category, locationPath, tags] = await Promise.all([
    item.categoryId ? categoryService.getCategory(item.categoryId) : Promise.resolve(undefined),
    item.locationId ? locationService.getPath(item.locationId) : Promise.resolve([]),
    tagService.listTags(),
  ])
  const tagNames = item.tagIds.map((id) => tags.find((t) => t.id === id)?.name).filter((n): n is string => Boolean(n))
  return { item, category, locationPath, tagNames }
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'Neu',
  good: 'Gut',
  fair: 'Gebraucht',
  poor: 'Abgenutzt',
}

export function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const { data, loading } = useLiveQuery(
    () => (itemId ? loadItemDetail(itemId) : Promise.resolve(undefined)),
    ['item', 'category', 'location', 'tag'],
    [itemId],
  )

  if (loading) return <p>Lädt…</p>
  if (!data) {
    return (
      <div className={styles.page}>
        <p>Dieser Gegenstand wurde nicht gefunden.</p>
        <Link to="/inventory">Zurück zum Inventar</Link>
      </div>
    )
  }

  const { item, category, locationPath, tagNames } = data

  const handleDelete = async () => {
    if (!itemId) return
    if (!window.confirm(`"${item.name}" wirklich löschen? Fotos und Dokumente werden mitgelöscht.`)) return
    setDeleting(true)
    await itemService.deleteItem(itemId)
    navigate('/inventory')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>{item.name}</h1>
          <p className={styles.breadcrumb}>
            {category?.name ?? 'Ohne Kategorie'}
            {locationPath.length > 0 && <> · {locationPath.map((l) => l.name).join(' › ')}</>}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={() => navigate(`/inventory/${itemId}/edit`)}>
            Bearbeiten
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            Löschen
          </Button>
        </div>
      </div>

      <PhotoSection itemId={item.id} />

      <div className={styles.grid}>
        <Detail label="Anzahl" value={`${item.quantity} ${item.unit}`.trim()} />
        <Detail label="Zustand" value={item.condition ? CONDITION_LABELS[item.condition] : undefined} />
        <Detail label="Kaufdatum" value={item.purchaseDate ? formatDate(item.purchaseDate) : undefined} />
        <Detail label="Kaufpreis" value={item.purchasePrice !== null ? formatCurrency(item.purchasePrice) : undefined} />
        <Detail label="Aktueller Wert" value={item.currentValue !== null ? formatCurrency(item.currentValue) : undefined} />
        <Detail label="Hersteller" value={item.manufacturer} />
        <Detail label="Modell" value={item.model} />
        <Detail label="Seriennummer" value={item.serialNumber} />
      </div>

      {item.description && (
        <section>
          <h2 className={styles.sectionTitle}>Beschreibung</h2>
          <p>{item.description}</p>
        </section>
      )}

      {tagNames.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Tags</h2>
          <div className={styles.tags}>
            {tagNames.map((name) => (
              <span key={name} className={styles.tag}>
                {name}
              </span>
            ))}
          </div>
        </section>
      )}

      {item.notes && (
        <section>
          <h2 className={styles.sectionTitle}>Notizen</h2>
          <p className={styles.notes}>{item.notes}</p>
        </section>
      )}

      <DocumentSection itemId={item.id} />
    </div>
  )
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className={styles.detail}>
      <p className={styles.detailLabel}>{label}</p>
      <p className={styles.detailValue}>{value}</p>
    </div>
  )
}
