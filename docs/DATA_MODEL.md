# Keller Inventory — Data Model

All entities use string `id` (UUID v4, `crypto.randomUUID()`). Timestamps
are ISO 8601 strings.

## Item

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | yes | |
| name | string | yes | only required field |
| description | string | no | |
| categoryId | string \| null | no | FK → Category |
| locationId | string \| null | no | FK → Location |
| quantity | number | no | default `1` |
| unit | string | no | e.g. "pcs", "m", "kg" |
| purchaseDate | string (ISO date) | no | |
| purchasePrice | number | no | |
| currentValue | number | no | |
| condition | string | no | free text or small enum (new/good/fair/poor) |
| manufacturer | string | no | |
| model | string | no | |
| serialNumber | string | no | |
| notes | string | no | |
| tagIds | string[] | no | default `[]`, FK → Tag |
| createdAt | string | yes | set on create |
| updatedAt | string | yes | set on create/update |

Photos and documents are **not** embedded — they reference the item via
`itemId` on the Photo/Document record (one-to-many).

## Location

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | yes | |
| name | string | yes | |
| parentId | string \| null | no | FK → Location; `null` = root |
| description | string | no | |
| createdAt | string | yes | |
| updatedAt | string | yes | |

Hierarchy example: `Keller` → `Regal 3` → `Fach B`, i.e. `Fach B.parentId
= Regal 3.id`, `Regal 3.parentId = Keller.id`, `Keller.parentId = null`.
Cycles are prevented in `locationService` (a location cannot become its own
ancestor).

## Category

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | yes | |
| name | string | yes | |
| icon | string | no | icon identifier/emoji |
| parentId | string \| null | no | FK → Category; supports subcategories |
| createdAt | string | yes | |
| updatedAt | string | yes | |

## Photo

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | yes | |
| itemId | string | yes | FK → Item |
| filename | string | yes | original filename |
| mimeType | string | yes | |
| data | Blob | yes | stored directly in IndexedDB |
| createdAt | string | yes | |

## Document

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | yes | |
| itemId | string | yes | FK → Item |
| filename | string | yes | |
| mimeType | string | yes | |
| size | number | yes | bytes, derived from `data.size` |
| data | Blob | yes | |
| createdAt | string | yes | |

## Tag

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | yes | |
| name | string | yes | unique, case-insensitive |

Items reference tags by `tagIds: string[]` (many-to-many via array, no
join table needed at this scale).

## IndexedDB Object Stores & Indexes

| Store | Key | Indexes |
|---|---|---|
| items | id | categoryId, locationId, updatedAt, name (for sort) |
| locations | id | parentId |
| categories | id | parentId |
| tags | id | name (unique) |
| photos | id | itemId |
| documents | id | itemId |

## Referential Integrity Rules

- Deleting a Category or Location: `locationService`/`categoryService`
  check for referencing items and require the caller to reassign or
  confirm cascading the reference to `null` (never a silent orphan
  reference to a deleted id).
- Deleting an Item cascades to its Photos and Documents (they have no
  meaning without the item).
- Deleting a Tag removes it from all items' `tagIds`.

## Export Schema (`data.json`)

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-09-16T12:00:00.000Z",
  "items": [Item, ...],
  "locations": [Location, ...],
  "categories": [Category, ...],
  "tags": [Tag, ...],
  "photos": [{ "id", "itemId", "filename", "mimeType", "createdAt" }, ...],
  "documents": [{ "id", "itemId", "filename", "mimeType", "size", "createdAt" }, ...]
}
```

Photo/document binary payloads live under `photos/<id>-<filename>` and
`documents/<id>-<filename>` in the backup ZIP; `data.json` only carries
metadata plus the relative path.
