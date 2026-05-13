# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## About

Welcome To My Garden (WTMG) is a platform connecting slow travelers with hosts who offer free camping spots in their gardens. The codebase is a SvelteKit frontend with Firebase backend (Firestore, Auth, Cloud Functions) and a Supabase PostgreSQL replica for advanced queries.

### Superfan and Membership

To use many core WTMG features, users need to be a "member". This was previously called "superfan", and is technically still referred to as "superfan" in many code areas (i18n). For new features or fixes, we should aim to use the term "member" or "membership".

Users can host their garden without being a member.

To check is user is a member, check the `$user.superfan` boolean.

## Commands

### Frontend

```bash
yarn dev                   # Start dev server (against local emulators)
yarn dev:staging           # Dev server against staging backend
yarn build                 # Production build
yarn check                 # TypeScript + svelte-check (type checking)
yarn check:watch           # Watch mode
yarn lint                  # ESLint + Prettier check
yarn format                # Auto-format with Prettier
yarn test:unit             # Vitest unit tests
yarn test:e2e              # Playwright E2E tests
```

### Backend (Firebase)

```bash
yarn firebase:demo         # Start Firebase emulators (demo project, no seed data)
yarn firebase:demo-seed    # Start emulators + seed test data (use for development)
yarn firebase:debug        # Start emulators with function debugging
```

### API (Cloud Functions) tests

```bash
# From api/ directory (or set env vars and run from root)
yarn mocha                 # Run all API tests
yarn mocha -f 'pattern'    # Run tests matching pattern
```

E2E and API tests expect emulators running. Set these env vars:

```
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

## Architecture

### Repository structure

- `src/` — SvelteKit frontend
- `api/` — Firebase Cloud Functions backend (Node.js)
- `tests/` — Playwright E2E tests
- `android/` / `ios/` — Capacitor native app wrappers
- `firestore.rules` / `storage.rules` — Firebase security rules

### Frontend routing

Routes live under `src/routes/[[lang]]/` — the optional `[[lang]]` segment enables URL-prefix-based i18n (`/en`, `/nl`, `/de`, etc.). Routes are split into:

- `(stateful)/` — interactive, auth-aware routes (map, garden management, chat, membership)
- `(static)/` — mostly pre-rendered marketing/info pages
- `routeplanner/` — embedded third-party iframe

Note that we use SvelteKit as a static-site generator. After a first HTML page load, SvelteKit uses client-side routing for subsequent page navigations, no new full navigations happen. Importantly, this means that JS context stays persistent across navigations.

#### About SvelteKit

- SvelteKit uses a layout system with +layout.svelte and +page.svelte components. If you look for the contents of a page, you should also consider the layout hierarchy the page is part of.

### Auth & user loading

- Root `+layout.svelte` initializes Firebase and starts listening for auth state
- `src/lib/api/auth.ts` sets up `onIdTokenChanged` which populates `$user` and `$userPrivate` stores
- **Important**: `$user` can be `null` during loading AND when logged out — always check `$isUserLoading` or await `resolveOnUserLoaded()` before making user-presence decisions
- User data is split: public fields in `users/{uid}`, sensitive fields in `users-private/{uid}`

### State management

Svelte stores (no Redux/Pinia). Each feature has its own store file in `src/lib/stores/`:

- `user.ts` — current user & their garden
- `auth.ts` — auth state and loading
- `chat.ts` — conversations and messages
- `garden.ts` — all gardens/campsites for the map
- `subscription.ts` — Stripe membership status
- `app.ts` — UI state (map viewport, modals, etc.)

### Firebase ↔ Supabase replication

Firestore is the primary database. A background replication layer (`api/src/replication/`) syncs data to a Supabase PostgreSQL instance used for queries that Firestore can't efficiently serve (e.g. geospatial queries).

### Cloud Functions

All functions are exported from `api/src/index.js`. Organized by domain:

- `auth.js` — user creation/deletion triggers
- `chat.js` — message creation, email notifications
- `campsites.js` — garden CRUD, moderation
- `subscriptions/` — Stripe webhook handling, membership management
- `mail.js` — SendGrid inbound parsing (email-to-chat reply)
- `queued/` — Cloud Tasks for scheduled jobs

### i18n

Uses `svelte-i18n`. Translation JSON files are in `src/lib/locales/` (indexed) and `src/locales/` (lazy-loaded per route group). Server-side locale detection reads `Accept-Language` header in `hooks.server.ts`.

### Testing strategy

- **Unit tests** (Vitest): `src/` utilities and pure functions
- **API tests** (Mocha + Sinon): `api/test/` — Cloud Function logic, email parsing, Stripe webhooks
- **E2E tests** (Playwright): `tests/e2e/` — full user flows against emulators; uses mobile device emulation (Pixel 4) by default

## Key tooling notes

- **Package manager**: Yarn 4 (Corepack). Always use `yarn`, never `npm`.
- **Node version**: 24 (use nvm: `nvm use`)
- **Java ≥ 21** required for Firebase Emulator Suite
- Firebase emulators may hang on exit; run `./killemulators.sh` if needed
- Vite has a custom plugin (`plugins/`) that strips CSS `:where()` selectors for browser compatibility
