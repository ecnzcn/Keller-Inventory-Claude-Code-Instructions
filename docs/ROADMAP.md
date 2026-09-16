# Keller Inventory — Roadmap

## v1.0 Build Order

Each phase ends with `npm run typecheck && npm test && npm run build`
before moving on, and a small, logical commit.

1. Project setup (Vite + React + TS, folder structure, lint/format, test
   runner)
2. Architecture scaffolding (db/repository/services/features/ui skeletons)
3. IndexedDB schema + connection layer
4. Repository layer (Item, Location, Category, Tag, Photo, Document)
5. Services layer (validation, hierarchy helpers, search)
6. App shell: routing, responsive nav (bottom nav / sidebar), dark mode
7. Dashboard
8. Inventory list (search, filter, sort, empty states)
9. Item Detail
10. Add/Edit Item form
11. Categories screen
12. Locations screen
13. Photos (capture/select, preview, delete)
14. Documents (attach, open, delete)
15. Export (backup ZIP)
16. Import (validation, conflict handling, restore)
17. PWA: manifest, icons, service worker, offline verification
18. Settings screen (export/import UI, appearance, app info)
19. Sample data generator (dev-only)
20. Automated tests (CRUD, search, filtering, hierarchy, export/import)
21. Accessibility + responsive QA pass at 375/768/1024/1440px
22. Final polish

## v1.0 Scope

Dashboard, inventory, item CRUD, categories, hierarchical locations,
search, filtering, sorting, photos, documents, tags, export, import,
responsive UI, dark mode, PWA installation, offline support.

## Explicitly Out of Scope for v1.0

User accounts, cloud backend, multi-user sharing, AI object recognition,
automatic price lookup, e-commerce integrations, subscriptions, payments.

## Prepared, Not Built (Extension Points)

- QR codes / barcode scanning — `Item` model can gain an optional
  `barcode` field later; no scanning UI or library added now.
- AI image recognition / OCR — would hang off the existing Photo/Document
  upload flow as a post-processing step; not implemented.
- Automatic categorization — would consume `searchService`/`itemService`;
  not implemented.
- Inventory statistics — dashboard aggregation code is isolated in
  `services/` so richer stats can be added without touching UI structure.
- Cloud synchronization — `repository/` interfaces are storage-agnostic
  specifically so a sync-capable backend can implement them later.
- Household sharing — blocked on cloud sync; not started.
- Widgets, native iOS/macOS apps — out of scope for the web app codebase.

## Status

All 22 phases above are implemented and verified (typecheck, unit tests,
production build, and manual browser QA at 375/768/1024/1440px in both
light and dark mode — see commit history for details per phase).

Known gaps worth a look before relying on this for real use:

- Camera capture / file picker is exercised via automated file input
  injection in tests; a real device's native camera sheet has not been
  tested by a human.
- No formal accessibility audit (screen reader pass, full keyboard-only
  walkthrough) was run beyond semantic HTML, labeled controls, and
  focus-visible styling applied throughout.
- The service worker's offline behavior was verified in Chromium via
  Playwright's network offline emulation, not on an actual iOS/Safari
  device.
