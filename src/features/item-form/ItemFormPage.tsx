import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buildHierarchyLabels } from '../../services/hierarchyLabels'
import { categoryService } from '../../services/categoryService'
import { ValidationError } from '../../services/errors'
import { itemService } from '../../services/itemService'
import { locationService } from '../../services/locationService'
import { tagService } from '../../services/tagService'
import type { Category, ItemCondition, Location } from '../../types/entities'
import { Button } from '../../ui/components/Button'
import styles from './ItemFormPage.module.css'

interface FormState {
  name: string
  description: string
  categoryId: string
  locationId: string
  quantity: string
  unit: string
  purchaseDate: string
  purchasePrice: string
  currentValue: string
  condition: ItemCondition | ''
  manufacturer: string
  model: string
  serialNumber: string
  notes: string
  tags: string
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  categoryId: '',
  locationId: '',
  quantity: '1',
  unit: '',
  purchaseDate: '',
  purchasePrice: '',
  currentValue: '',
  condition: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  notes: '',
  tags: '',
}

const CONDITION_OPTIONS: { value: ItemCondition; label: string }[] = [
  { value: 'new', label: 'Neu' },
  { value: 'good', label: 'Gut' },
  { value: 'fair', label: 'Gebraucht' },
  { value: 'poor', label: 'Abgenutzt' },
]

function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

export function ItemFormPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const isEditing = Boolean(itemId)
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [categories, setCategories] = useState<Category[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEditing)

  useEffect(() => {
    Promise.all([categoryService.listAll(), locationService.listAll()]).then(([cats, locs]) => {
      setCategories(cats)
      setLocations(locs)
    })
  }, [])

  useEffect(() => {
    if (!itemId) return
    let cancelled = false
    itemService.getItem(itemId).then(async (item) => {
      if (cancelled || !item) return
      const tags = await tagService.listTags()
      const tagNames = item.tagIds.map((id) => tags.find((t) => t.id === id)?.name).filter(Boolean)
      setForm({
        name: item.name,
        description: item.description,
        categoryId: item.categoryId ?? '',
        locationId: item.locationId ?? '',
        quantity: String(item.quantity),
        unit: item.unit,
        purchaseDate: item.purchaseDate ?? '',
        purchasePrice: item.purchasePrice !== null ? String(item.purchasePrice) : '',
        currentValue: item.currentValue !== null ? String(item.currentValue) : '',
        condition: item.condition ?? '',
        manufacturer: item.manufacturer,
        model: item.model,
        serialNumber: item.serialNumber,
        notes: item.notes,
        tags: tagNames.join(', '),
      })
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [itemId])

  const categoryLabels = buildHierarchyLabels(categories)
  const locationLabels = buildHierarchyLabels(locations)

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(undefined)
    setSubmitting(true)
    try {
      const tagNames = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const tagIds = await tagService.resolveTagIds(tagNames)

      const input = {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId || null,
        locationId: form.locationId || null,
        quantity: toNumberOrNull(form.quantity) ?? 1,
        unit: form.unit,
        purchaseDate: form.purchaseDate || null,
        purchasePrice: toNumberOrNull(form.purchasePrice),
        currentValue: toNumberOrNull(form.currentValue),
        condition: form.condition || null,
        manufacturer: form.manufacturer,
        model: form.model,
        serialNumber: form.serialNumber,
        notes: form.notes,
        tagIds,
      }

      if (isEditing && itemId) {
        await itemService.updateItem(itemId, input)
        navigate(`/inventory/${itemId}`)
      } else {
        const created = await itemService.createItem(input)
        navigate(`/inventory/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof ValidationError ? err.message : 'Speichern fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p>Lädt…</p>

  return (
    <div className={styles.page}>
      <h1>{isEditing ? 'Gegenstand bearbeiten' : 'Neuer Gegenstand'}</h1>

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
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span>Beschreibung</span>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={2}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span>Kategorie</span>
            <select value={form.categoryId} onChange={(e) => updateField('categoryId', e.target.value)}>
              <option value="">Keine</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryLabels.get(category.id)}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Ort</span>
            <select value={form.locationId} onChange={(e) => updateField('locationId', e.target.value)}>
              <option value="">Kein</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {locationLabels.get(location.id)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span>Anzahl</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={(e) => updateField('quantity', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Einheit</span>
            <input
              value={form.unit}
              onChange={(e) => updateField('unit', e.target.value)}
              placeholder="Stk., m, kg …"
            />
          </label>
          <label className={styles.field}>
            <span>Zustand</span>
            <select
              value={form.condition}
              onChange={(e) => updateField('condition', e.target.value as ItemCondition | '')}
            >
              <option value="">Unbekannt</option>
              {CONDITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span>Kaufdatum</span>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => updateField('purchaseDate', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Kaufpreis (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.purchasePrice}
              onChange={(e) => updateField('purchasePrice', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span>Aktueller Wert (€)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.currentValue}
              onChange={(e) => updateField('currentValue', e.target.value)}
            />
          </label>
        </div>

        <div className={styles.row}>
          <label className={styles.field}>
            <span>Hersteller</span>
            <input value={form.manufacturer} onChange={(e) => updateField('manufacturer', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Modell</span>
            <input value={form.model} onChange={(e) => updateField('model', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Seriennummer</span>
            <input value={form.serialNumber} onChange={(e) => updateField('serialNumber', e.target.value)} />
          </label>
        </div>

        <label className={styles.field}>
          <span>Tags (durch Komma getrennt)</span>
          <input value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="Outdoor, Werkzeug" />
        </label>

        <label className={styles.field}>
          <span>Notizen</span>
          <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={3} />
        </label>

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Abbrechen
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Speichert…' : 'Speichern'}
          </Button>
        </div>
      </form>
    </div>
  )
}
