import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { categoryService } from '../../services/categoryService'
import { itemService } from '../../services/itemService'
import { locationService } from '../../services/locationService'
import { Card } from '../../ui/components/Card'
import { EmptyState } from '../../ui/components/EmptyState'
import { formatCurrency, formatDate } from '../../ui/format'
import { useLiveQuery } from '../shared/useLiveQuery'
import styles from './DashboardPage.module.css'

async function loadDashboardData() {
  const [items, locations, categories] = await Promise.all([
    itemService.listItems(),
    locationService.listAll(),
    categoryService.listAll(),
  ])
  const totalValue = items.reduce((sum, item) => sum + (item.currentValue ?? item.purchasePrice ?? 0), 0)
  const recentItems = [...items]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
  return {
    itemCount: items.length,
    locationCount: locations.length,
    categoryCount: categories.length,
    totalValue,
    recentItems,
  }
}

export function DashboardPage() {
  const { data, loading } = useLiveQuery(loadDashboardData, ['item', 'location', 'category'])
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    navigate(`/inventory?q=${encodeURIComponent(query)}`)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Keller</h1>
        <p className={styles.subtitle}>Was du besitzt, auf einen Blick.</p>
      </header>

      <form className={styles.searchBar} onSubmit={handleSearch} role="search">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Gegenstände durchsuchen…"
          aria-label="Gegenstände durchsuchen"
        />
        <button type="submit">Suchen</button>
      </form>

      <div className={styles.stats}>
        <Card>
          <p className={styles.statValue}>{data?.itemCount ?? '–'}</p>
          <p className={styles.statLabel}>Gegenstände</p>
        </Card>
        <Card>
          <p className={styles.statValue}>{data?.locationCount ?? '–'}</p>
          <p className={styles.statLabel}>Orte</p>
        </Card>
        <Card>
          <p className={styles.statValue}>{data?.categoryCount ?? '–'}</p>
          <p className={styles.statLabel}>Kategorien</p>
        </Card>
        <Card>
          <p className={styles.statValue}>{formatCurrency(data?.totalValue ?? 0)}</p>
          <p className={styles.statLabel}>Gesamtwert (geschätzt)</p>
        </Card>
      </div>

      <section>
        <div className={styles.sectionHeader}>
          <h2>Zuletzt hinzugefügt</h2>
          <Link to="/inventory">Alle ansehen</Link>
        </div>

        {!loading && data && data.recentItems.length === 0 && (
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

        <div className={styles.recentList}>
          {data?.recentItems.map((item) => (
            <Link key={item.id} to={`/inventory/${item.id}`} className={styles.recentLink}>
              <Card interactive>
                <p className={styles.itemName}>{item.name}</p>
                <p className={styles.itemMeta}>
                  {formatDate(item.createdAt)} · {formatCurrency(item.currentValue ?? item.purchasePrice)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
