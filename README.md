# Keller

Keller is a private, offline-first inventory management Progressive Web
App. It answers one question: **what do I own, how many do I have, and
where is it?**

Built for personal use on iPhone, iPad, and macOS (and any modern desktop
browser). All data stays on-device in IndexedDB — no backend, no account,
no tracking.

See `CLAUDE.md` for the full project brief and `docs/` for requirements,
architecture, data model, and the build roadmap.

## Getting started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — typecheck and build for production
- `npm run preview` — serve the production build locally
- `npm run typecheck` — run TypeScript project checks
- `npm test` — run the Vitest suite once
- `npm run test:watch` — run tests in watch mode
- `npm run lint` — run oxlint

## Tech stack

TypeScript, React, Vite, IndexedDB, a hand-written service worker, and a
Web App Manifest — see `docs/ARCHITECTURE.md` for the layering and the
reasoning behind keeping dependencies minimal.
