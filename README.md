# Welcome To My Garden ![GitHub](https://img.shields.io/github/license/welcometomygarden/welcometomygarden?label=License)

This repository houses the front-end and back-end application code of [Welcome To My Garden](https://welcometomygarden.org).

Welcome To My Garden is a network of citizens offering camping spots in their gardens to slow travellers.

## Overview

The frontend (./) is a static site/SPA hybrid built with [SvelteKit](https://kit.svelte.dev/) and [Firebase](https://firebase.google.com/docs).

The backend (./api) is largely built on Firebase Cloud Functions.

The system is integrated with third-party services for several important features:

- Mapbox: for our maps on the front-end.
- SendGrid: for transactional emails & newsletter contact lists.
- Stripe: for our membership program.
- Supabase PostgreSQL replica: for more advanced queries and features that Firestore can't handle.

## Contributing

Problems & bug reports are welcome in [Issues](https://github.com/WelcometoMyGarden/welcometomygarden/issues).

For other contributions, check [CONTRIBUTING.md](./CONTRIBUTING.md) first.
