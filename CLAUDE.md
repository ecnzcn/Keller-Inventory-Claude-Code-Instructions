# Keller Inventory – Claude Code Instructions

## Project

Keller is a private, offline-first inventory management Progressive Web App (PWA).

The primary purpose is to answer:

> What do I own, how many do I have, and where is it located?

The application is intended primarily for personal use on:

- iPhone
- iPad
- macOS

It must also work in modern desktop browsers.

## Technology

Use:

- TypeScript
- React
- Vite
- IndexedDB for local persistence
- Service Worker for offline support
- Web App Manifest for PWA installation
- CSS for styling

Avoid unnecessary third-party dependencies.

Do not introduce a library when the functionality can reasonably be implemented using browser APIs or existing project code.

## Architecture

Use a modular architecture.

The application must follow this general dependency direction:

```
UI → Features → Services → Repository → Database
```

React components must not directly manipulate IndexedDB.

All persistent data access must go through repository or service abstractions.

Keep business logic outside React presentation components whenever practical.

## Data Model

Core entities:

- Item
- Location
- Category
- Photo
- Document
- Tag

Items can reference:

- one category
- one hierarchical location
- multiple photos
- multiple documents
- multiple tags

Locations support parent-child relationships.

Example:

```
Keller
→ Regal 3
  → Fach B
```

## Product Principles

1. Fast item entry
2. Excellent search
3. Clear location information
4. Offline-first
5. Local data ownership
6. Simple UX
7. Responsive design
8. Data portability
9. No unnecessary complexity

The application should feel like a modern personal productivity application rather than an enterprise inventory system.

## UX Principles

Use:

- clear visual hierarchy
- generous spacing
- rounded cards
- subtle borders
- restrained visual styling
- readable typography
- responsive layouts
- dark mode
- accessible controls

Avoid:

- excessive gradients
- excessive animations
- unnecessary decoration
- dense enterprise-style tables on mobile
- unnecessary confirmation dialogs
- overly complicated workflows

The primary action "Add item" must always be easy to reach.

## Responsive Design

Support at minimum:

- 375px mobile
- 768px tablet
- 1024px desktop
- 1440px+ large desktop

Mobile:

- bottom navigation
- single-column layouts
- touch-friendly controls

Desktop:

- sidebar navigation
- multi-column layouts where useful
- keyboard-friendly interactions

## Offline Requirements

Core functionality must work without an internet connection.

Offline functionality includes:

- application startup
- viewing inventory
- searching
- filtering
- adding items
- editing items
- deleting items
- viewing photos
- exporting data

Do not make the application dependent on a remote server for core functionality.

## Database

Use IndexedDB.

Do not access IndexedDB directly from React components.

Create a repository abstraction.

The database layer must be replaceable in the future.

Possible future backends include:

- SQLite
- Supabase
- Firebase
- another synchronization backend

Do not implement a backend unless explicitly requested.

## Data Portability

Implement application-level export/import.

The export format should be JSON-based.

Media files should be included in a structured backup format.

Example:

```
keller-backup/
  data.json
  photos/
  documents/
```

A ZIP representation may be used for the final user-facing backup.

Never make user data dependent on a proprietary database format.

## Security

This is a private application.

- Do not add authentication unless explicitly requested.
- Do not transmit user data to external services unless explicitly requested.
- Do not implement analytics or tracking.
- Do not upload photos or documents anywhere by default.

## Images and Documents

Images and documents may be large.

Do not unnecessarily duplicate large binary data.

Use appropriate browser APIs and object URLs.

Implement graceful handling for:

- unsupported files
- large files
- failed imports
- missing files

## Search

Search should support:

- item name
- description
- manufacturer
- model
- serial number
- notes
- category
- location
- tags

Search should be case-insensitive.

Search results should update quickly as the user types.

## Error Handling

Never silently swallow errors.

User-facing errors should be understandable.

Developer errors should contain enough information to diagnose the problem.

Do not expose stack traces to normal users.

## Testing

Before considering a feature complete:

1. Run TypeScript checks.
2. Run unit tests.
3. Run the production build.
4. Verify the affected feature.
5. Verify existing functionality has not regressed.

For important business logic, add automated tests.

## Git

Make small, logical commits.

Do not rewrite history unless explicitly instructed.

Do not delete existing functionality without explicit approval.

Before making large architectural changes:

- explain the reason
- identify affected files
- identify potential risks

## Coding Style

Prefer:

- small components
- descriptive names
- explicit types
- reusable components
- pure functions where practical
- separation of concerns

Avoid:

- giant components
- duplicated logic
- deeply nested conditional rendering
- unnecessary global state
- magic numbers
- hard-coded user-facing strings where localization may later be required

## Important Rule

Do not implement speculative features.

Build the requested functionality first.

If you identify a potentially useful future feature, mention it separately rather than silently implementing it.

## Development Workflow

For every substantial task:

1. Inspect the existing project.
2. Understand the current architecture.
3. Identify affected files.
4. Explain the planned change briefly.
5. Implement the change.
6. Run checks/tests/build.
7. Fix resulting issues.
8. Summarize what changed.

Do not assume the project is empty.

Do not overwrite existing working functionality unnecessarily.

## Current Version

Target: Keller v1.0

Version 1.0 includes:

- dashboard
- inventory
- item CRUD
- categories
- hierarchical locations
- search
- filtering
- sorting
- photos
- documents
- tags
- export
- import
- responsive UI
- dark mode
- PWA installation
- offline support

Version 1.0 does NOT include:

- user accounts
- cloud backend
- multi-user sharing
- AI object recognition
- automatic price lookup
- e-commerce integrations
- subscriptions
- payments

## Product Quality

Prioritize reliability and simplicity over feature count.

The application is intended to be used regularly for years.

Prefer maintainable solutions over clever solutions.
