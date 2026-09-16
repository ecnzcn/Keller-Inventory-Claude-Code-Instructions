import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { categoryService } from '../../services/categoryService'
import { itemService } from '../../services/itemService'
import { locationService } from '../../services/locationService'
import {
  buildSearchContext,
  filterItems,
  searchItems,
  sortItems,
  type SortDirection,
  type SortField,
} from '../../services/searchService'
import { tagService } from '../../services/tagService'
import { Card } from '../../ui/components/Card'
import { EmptyState } from '../../ui/components/EmptyState'
import { formatCurrency } from '../../ui/format'
import { useLiveQuery } from '../shared/useLiveQuery'
import styles from './InventoryPage.module.css'

async function loadInventoryData() {
  const [items, categories, locations, tags] = await Promise.all([
    itemService.listItems(),
    categoryService.listAll(),
    locationService.listAll(),
    tagService.listTags(),
  ])
  return { items, categories, locations, tags, context: buildSearchContext(categories, locations, tags) }
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'createdAt', label: 'Erstellt am' },
  { value: 'updatedAt', label: 'Geändert am' },
  { value: 'category', label: 'Kategorie' },
  { value: 'location', label: 'Ort' },
  { value: 'value', label: 'Wert' },
]

export function InventoryPage() {
  const { data, loading } = useLiveQuery(loadInventoryData, ['item', 'location', 'category', 'tag'])
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const [categoryId, setCategoryId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const setQuery = (value: string) => {
    setSearchParams(value ? { q: value } : {}, { replace: true })
  }

  const visibleItems = useMemo(() => {
    if (!data) return []
    let result = searchItems(data.items, query, data.context)
    result = filterItems(result, {
      categoryId: categoryId || undefined,
      locationId: locationId || undefined,
    })
    return sortItems(result, sortField, sortDirection, data.context)
  }, [data, query, categoryId, locationId, sortField, sortDirection])

  const hasAnyItems = (data?.items.length ?? 0) > 0
  const hasFiltersApplied = query.trim() !== '' || categoryId !== '' || locationId !== ''

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Inventar</h1>
        <Link to="/inventory/new" className={styles.addLink}>
          + Gegenstand
        </Link>
      </header>

      <div className={styles.controls}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Suchen…"
          aria-label="Gegenstände durchsuchen"
          className={styles.searchInput}
        />
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-label="Nach Kategorie filtern"
        >
          <option value="">Alle Kategorien</option>
          {data?.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          aria-label="Nach Ort filtern"
        >
          <option value="">Alle Orte</option>
          {data?.locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <select
          value={sortField}
          onChange={(event) => setSortField(event.target.value as SortField)}
          aria-label="Sortieren nach"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.sortDirectionButton}
          onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
          aria-label={sortDirection === 'asc' ? 'Aufsteigend sortiert' : 'Absteigend sortiert'}
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      {!loading && !hasAnyItems && (
        <EmptyState
          icon={<span>📦</span>}
          title="Dein Keller ist noch leer."
          description="Füge deinen ersten Gegenstand hinzu, um loszulegen."
          action={
            <Link to="/inventory/new" className={styles.primaryLink}>
              Ersten Gegenstand hinzufügen
            </Link>
          }
        />
      )}

      {!loading && hasAnyItems && visibleItems.length === 0 && (
        <EmptyState
          icon={<span>🔍</span>}
          title="Keine Gegenstände gefunden."
          description={hasFiltersApplied ? 'Versuche es mit anderen Suchbegriffen oder Filtern.' : undefined}
        />
      )}

      <div className={styles.grid}>
        {visibleItems.map((item) => {
          const category = item.categoryId ? data?.context.categoriesById.get(item.categoryId) : undefined
          const location = item.locationId ? data?.context.locationsById.get(item.locationId) : undefined
          return (
            <Link key={item.id} to={`/inventory/${item.id}`} className={styles.cardLink}>
              <Card interactive>
                <p className={styles.itemName}>{item.name}</p>
                <p className={styles.itemMeta}>
                  {category?.name ?? 'Ohne Kategorie'} · {location?.name ?? 'Ohne Ort'}
                </p>
                <div className={styles.cardFooter}>
                  <span>
                    {item.quantity} {item.unit}
                  </span>
                  <span>{formatCurrency(item.currentValue ?? item.purchasePrice)}</span>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
