# Keller Inventory — Architecture

## Stack

TypeScript, React, Vite, IndexedDB, Service Worker, Web App Manifest, plain
CSS. Two small, well-justified dependencies beyond React/Vite:

- `react-router-dom` — multi-screen navigation, deep links, back button
  behavior are impractical to hand-roll safely for a PWA.
- `vitest` / `@testing-library/react` (dev-only) — test runner; Vite-native,
  no runtime cost.

Everything else (IndexedDB access, ZIP read/write, service worker caching)
is implemented directly against browser APIs to honor the "avoid
unnecessary dependencies" rule, since these are all bounded, well-understood
problems for this app's scope.

## Layering

```
ui/          React presentation components (dumb, styling, layout)
features/    Screen-level components + hooks, compose services, own local UI state
services/    Business logic, validation, orchestration (framework-agnostic)
repository/  CRUD abstractions per entity, hide storage details
db/          IndexedDB schema, connection, low-level promisified helpers
```

Dependency direction is strictly top-to-bottom:
`ui → features → services → repository → db`.

- React components never import `db/` or `repository/` directly.
- `services/` never import React.
- `repository/` exposes typed CRUD + query methods per entity and is the
  **only** layer that touches IndexedDB. Swapping IndexedDB for SQLite/
  Supabase/Firebase later means rewriting `repository/` + `db/` only.

## Folder Structure

```
src/
  db/
    schema.ts          object stores, indexes, version/migrations
    connection.ts       openDatabase(), promisified IDB helpers
  repository/
    itemRepository.ts
    locationRepository.ts
    categoryRepository.ts
    tagRepository.ts
    photoRepository.ts
    documentRepository.ts
    types.ts
  services/
    itemService.ts       validation, derived values, tag/category linking
    locationService.ts    hierarchy helpers (ancestors, descendants, counts)
    categoryService.ts
    searchService.ts      case-insensitive multi-field search/filter/sort
    exportService.ts      backup ZIP creation
    importService.ts      backup validation + restore
    sampleDataService.ts  dev-only fixture generator
  features/
    dashboard/
    inventory/
    item-detail/
    item-form/
    locations/
    categories/
    settings/
  ui/
    components/          Button, Card, EmptyState, Field, Modal, etc.
    layout/              AppShell, Sidebar, BottomNav, TopBar
    theme/               dark-mode context, CSS tokens
  app/
    routes.tsx
    App.tsx
  main.tsx
  sw/
    service-worker.ts (built separately, registered from main.tsx)
public/
  manifest.webmanifest
  icons/
docs/
tests/ (or colocated *.test.ts(x))
```

## Data Flow Example (Add Item)

1. `features/item-form` collects input, calls `services/itemService.createItem(input)`.
2. `itemService` validates (`name` required, trims strings, normalizes
   numbers/dates), assigns `id`/`createdAt`/`updatedAt`, links tags
   (creating new ones via `tagRepository` if needed).
3. `itemRepository.create(item)` writes to the `items` object store.
4. Feature hook re-queries via `itemService.listItems()` (or an in-memory
   store/observer) and re-renders.

## Routing

`react-router-dom`'s `createHashRouter` is used instead of the browser
history router. The app has no server to provide SPA fallback routing, and
its primary use case is being installed to the home screen and opened
offline — a hash-based URL (`#/inventory/:id`) always resolves correctly
from a single static `index.html` with no server-side rewrite rules or
extra service-worker routing logic required.

## State Management

No global state library. Each feature owns its data via small hooks
(`useItems`, `useLocations`, …) that call services and hold results in
`useState`/`useReducer`, revalidating after mutations. A tiny pub/sub
(`services/db/changeBus.ts`) lets multiple screens invalidate their cached
lists when another screen mutates the same entity (e.g. deleting a
location from Settings should update the Locations screen).

Theme (dark/light) and toast/error notifications are the only cross-cutting
concerns using React Context.

## IndexedDB Schema (v1)

Object stores: `items`, `locations`, `categories`, `tags`, `photos`,
`documents`. See `docs/DATA_MODEL.md` for fields and indexes. Binary photo/
document data is stored as `Blob` directly in IndexedDB (supported in all
target browsers), referenced by `id`; `URL.createObjectURL` is used for
display and revoked on unmount to avoid leaks.

## Export/Import

`exportService` builds an uncompressed (STORE-method) ZIP by hand
(local file headers + central directory + CRC32), containing `data.json`
and `photos/`, `documents/` folders with blobs written under their stored
filenames. `importService` reads the ZIP, validates `data.json` against a
runtime schema check (not just TypeScript types, since the file is
untrusted input), diffs against existing IDs to surface conflicts, and only
writes to IndexedDB after explicit user confirmation.

## PWA / Service Worker

Hand-written service worker (no build-plugin) that precaches the app shell
(hashed Vite build assets via a manifest emitted at build time) and serves
cached assets when offline, falling back to network-first for anything not
precached. IndexedDB already gives full offline data access, so the service
worker's job is limited to making the app shell load without a network.

## Deployment

The app is a static build (`npm run build` → `dist/`) with no server-side
requirement, so it can be hosted anywhere that serves static files over
HTTPS. `.github/workflows/deploy-pages.yml` builds and deploys it to
GitHub Pages on push, for testing on a real device without any paid
infrastructure.

GitHub Pages project sites are served under `https://<user>.github.io/
<repo-name>/`, not the domain root, which the app's absolute-root paths
(manifest link, icons, service worker registration) originally assumed.
This is handled generically rather than hardcoded to GitHub Pages:

- `vite.config.ts`'s `base` reads `VITE_BASE_PATH` (default `/`); the
  workflow sets it to `/<repo-name>/` for the Pages build only. Vite then
  rewrites `index.html`'s `%BASE_URL%` placeholders and all built asset
  URLs accordingly.
- `public/manifest.webmanifest` uses **relative** `start_url`/`scope`/icon
  paths (no leading `/`), which the Web App Manifest spec resolves
  relative to the manifest's own URL — correct at any subpath without
  needing a build-time rewrite of this static file.
- `public/sw.js` derives its precache URLs from `self.registration.scope`
  at runtime instead of hardcoding `/`.
- `registerServiceWorker.ts` registers `${import.meta.env.BASE_URL}sw.js`.

Any other static host (a custom domain, Netlify, Vercel, S3, ...) works
without these adjustments at all, since they typically serve from a
domain root where `VITE_BASE_PATH` stays at its default.

## Error Handling

- `services/` throw typed errors (`ValidationError`, `NotFoundError`,
  `ImportError`, …) with actionable messages.
- `features/` catch these and show user-facing messages via a shared
  `ui/components/Toast` or inline form errors; never a raw stack trace.
- Unexpected errors are logged to `console.error` with context and shown as
  a generic "Something went wrong" message.

## Extension Points (v1.0 does not implement, but does not block)

- `repository/` interfaces are storage-agnostic — a future SQLite/Supabase
  backend implements the same interface.
- `Item` has room for a future `barcode`/`qrCode` field without a schema
  rewrite (added as an optional field when needed, not pre-added
  speculatively).
- `services/exportService` output format is versioned (`schemaVersion` in
  `data.json`) so future sync features can diff against a known shape.
