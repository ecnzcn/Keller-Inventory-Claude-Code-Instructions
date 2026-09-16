# Keller Inventory — Requirements

## Purpose

Answer, at a glance: **what do I own, how many do I have, and exactly where is it?**

## Target Platforms

Primary: iPhone, iPad, macOS (Safari). Must also work in modern desktop
browsers (Chrome, Edge, Firefox). Installable as a PWA.

## Functional Requirements

### Screens

- **Dashboard** — total items, locations, categories, estimated total value,
  recently added items, prominent search, prominent "Add item".
- **Inventory** — searchable/filterable/sortable item list, responsive cards,
  empty states.
- **Item Detail** — all item fields, photos, documents, tags; edit/delete;
  add photo/document.
- **Add/Edit Item** — only `name` is required; optimized for mobile entry.
- **Locations** — hierarchical CRUD, browse children, item counts per node.
- **Categories** — CRUD, browse, item counts.
- **Settings** — export, import, appearance/dark mode, app info.

### Data

Entities: Item, Location, Category, Photo, Document, Tag. See
`docs/DATA_MODEL.md` for fields and relationships.

### Search

Case-insensitive, updates while typing, matches: name, description,
manufacturer, model, serial number, notes, category name, location name,
tags.

### Sorting (Inventory)

name, created date, modified date, category, location, value.

### Photos & Documents

- Photos: camera capture or file/photo picker on mobile, file picker on
  desktop; multiple per item; preview; delete. Never uploaded anywhere.
- Documents: PDF, images, common formats; filename, type, size shown; open
  and delete.

### Export / Import

- Export produces `Keller-Backup-YYYY-MM-DD.zip` containing `data.json`,
  `photos/`, `documents/`.
- Import validates the ZIP structure and JSON schema, detects malformed
  data, warns on conflicts, requires user confirmation, then imports and
  reports the result. Existing data is never silently discarded.

### PWA / Offline

Installable (manifest + icons), service worker with offline app-shell and
data access (IndexedDB is local already). Core functionality — startup,
view, search, filter, add, edit, delete, view photos, export — works
fully offline after first load.

### Responsive Design

Breakpoints tested at 375 / 768 / 1024 / 1440px. Mobile: bottom nav,
single column, touch targets. Desktop: sidebar nav, multi-column where
useful, keyboard-friendly.

### Accessibility

Semantic HTML, labeled controls, keyboard navigation, visible focus,
sufficient contrast, ARIA only where semantics are insufficient, touch
targets ≥ 44px.

### Sample Data

Dev-only generator with realistic household items/categories/locations,
never bundled into production builds unless explicitly enabled via a
dev-only flag.

## Non-Functional Requirements

- No authentication, backend, cloud sync, analytics, tracking, payments,
  or multi-user support in v1.0.
- No unnecessary third-party dependencies; prefer browser APIs.
- Business logic outside presentation components.
- Data stays local; database implementation must be swappable later.

## Out of Scope (v1.0)

User accounts, cloud backend, multi-user sharing, AI object recognition,
automatic price lookup, e-commerce integrations, subscriptions, payments,
QR/barcode scanning, OCR, cloud sync, native apps (see `docs/ROADMAP.md`
for how these are prepared for, not built).

## Acceptance Criteria (high level)

- TypeScript compiles with no errors.
- Automated tests pass for item CRUD, search, filtering, hierarchical
  locations, category assignment, export, import, malformed-import
  handling.
- Production build succeeds and the app is installable and usable
  offline.
- All core screens work correctly at all four breakpoints, light and
  dark mode.
