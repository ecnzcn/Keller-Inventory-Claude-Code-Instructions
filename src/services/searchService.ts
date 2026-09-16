import type { Category, Item, Location, Tag } from '../types/entities'

export type SortField = 'name' | 'createdAt' | 'updatedAt' | 'category' | 'location' | 'value'
export type SortDirection = 'asc' | 'desc'

export interface SearchContext {
  categoriesById: Map<string, Category>
  locationsById: Map<string, Location>
  tagsById: Map<string, Tag>
}

export function buildSearchContext(categories: Category[], locations: Location[], tags: Tag[]): SearchContext {
  return {
    categoriesById: new Map(categories.map((c) => [c.id, c])),
    locationsById: new Map(locations.map((l) => [l.id, l])),
    tagsById: new Map(tags.map((t) => [t.id, t])),
  }
}

function itemSearchHaystack(item: Item, context: SearchContext): string {
  const category = item.categoryId ? context.categoriesById.get(item.categoryId) : undefined
  const location = item.locationId ? context.locationsById.get(item.locationId) : undefined
  const tagNames = item.tagIds.map((id) => context.tagsById.get(id)?.name ?? '')

  return [
    item.name,
    item.description,
    item.manufacturer,
    item.model,
    item.serialNumber,
    item.notes,
    category?.name ?? '',
    location?.name ?? '',
    ...tagNames,
  ]
    .join(' ␟ ')
    .toLowerCase()
}

/** Case-insensitive search across name, description, manufacturer, model, serial number, notes, category, location, and tags. */
export function searchItems(items: Item[], query: string, context: SearchContext): Item[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return items
  return items.filter((item) => itemSearchHaystack(item, context).includes(trimmed))
}

export interface ItemFilters {
  categoryId?: string | null
  locationId?: string | null
  tagIds?: string[]
}

export function filterItems(items: Item[], filters: ItemFilters): Item[] {
  return items.filter((item) => {
    if (filters.categoryId !== undefined && item.categoryId !== filters.categoryId) return false
    if (filters.locationId !== undefined && item.locationId !== filters.locationId) return false
    if (filters.tagIds && filters.tagIds.length > 0) {
      if (!filters.tagIds.every((tagId) => item.tagIds.includes(tagId))) return false
    }
    return true
  })
}

function itemValue(item: Item): number {
  return item.currentValue ?? item.purchasePrice ?? 0
}

export function sortItems(
  items: Item[],
  field: SortField,
  direction: SortDirection,
  context: SearchContext,
): Item[] {
  const factor = direction === 'asc' ? 1 : -1
  const sorted = [...items].sort((a, b) => {
    switch (field) {
      case 'name':
        return a.name.localeCompare(b.name) * factor
      case 'createdAt':
        return a.createdAt.localeCompare(b.createdAt) * factor
      case 'updatedAt':
        return a.updatedAt.localeCompare(b.updatedAt) * factor
      case 'value':
        return (itemValue(a) - itemValue(b)) * factor
      case 'category': {
        const nameA = (a.categoryId ? context.categoriesById.get(a.categoryId)?.name : '') ?? ''
        const nameB = (b.categoryId ? context.categoriesById.get(b.categoryId)?.name : '') ?? ''
        return nameA.localeCompare(nameB) * factor
      }
      case 'location': {
        const nameA = (a.locationId ? context.locationsById.get(a.locationId)?.name : '') ?? ''
        const nameB = (b.locationId ? context.locationsById.get(b.locationId)?.name : '') ?? ''
        return nameA.localeCompare(nameB) * factor
      }
      default:
        return 0
    }
  })
  return sorted
}
