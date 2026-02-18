# WTMG Development Environment

**Heads-up:** we try to keep this guide up-to-date, but it may currently not be sufficient to produce a working development environment, as it has not been tested from scratch for a while. If you experience any problems, feel free to file an issue.

## Project overview

The frontend (./) is a static site/SPA hybrid built with [SvelteKit](https://kit.svelte.dev/) and [Firebase](https://firebase.google.com/docs).

The backend (./api) is largely built on Firebase Cloud Functions.

The system is integrated with third-party services for several important features:

- Mapbox: for our maps on the front-end.
- SendGrid: for transactional emails & newsletter contact lists.
- Stripe: for our membership program.
- A Supabase PostgreSQL replica: for more advanced queries and features that Firestore can't handle.

## Requirements

- [Node](https://nodejs.org/en/download/) v24. Using [nvm](https://github.com/nvm-sh/nvm) is recommended. This codebase might work with other older or newer node versions too, but these aren't tested.
- Java runtime environment (JRE) >= v21. This is required for Firebase's CLI. [Adoptium builds](https://adoptium.net/en-GB/) are helpful.
- The Yarn package manager version which is defined in [package.json](../package.json), which should be installed [via Corepack](https://yarnpkg.com/corepack#installation).
- The [Firebase CLI](https://firebaseopensource.com/projects/firebase/firebase-tools/), installed globally via npm (`npm i -g firebase-tools`). Make sure globally installed node binaries are added to your path.
- A tool to copy files from a public Google Storage bucket, such as `gsutil`, `google storage` or `rclone`
- Optional: [Mailpit](https://mailpit.axllent.org/) for testing emails locally.
- A Mapbox API key, you can [get one from Mapbox](https://docs.mapbox.com/help/getting-started/#how-to-use-mapbox). If you don't supply one, then some pages will crash. Mapbox asks for payment details to get a token, but has a free tier that should be sufficient for local development needs.

## Project setup

1. Install project dependencies, in both the root and `/api` directory.

   ```sh
   yarn install --immutable
   cd api && yarn install --immutable && cd -
   ```

2. Create environment files from their examples.

   ```sh
   # For the frontend SvelteKit app. This follows the way Vite env files are set up: https://vitejs.dev/guide/env-and-mode.html#modes

   cp .env.example .env.development.local

   # For the backend Firebase Cloud Functions local emulator

   cd api && cp .env.example .env.local && cd -
   ```

   Next, fill in your `VITE_MAPBOX_ACCESS_TOKEN` in the front-end `.env.local`.

3. Download source assets from our bucket, which are not (yet) tracked in git. You can also use another tool for this.

   ```sh
   gsutil -m cp -r gs://wtmg-static/assets src/lib
   ```

## Next, get the dev servers running

Start all Firebase emulators:

```sh
yarn firebase:demo-seed
```

This will locally emulate our "backend": Firebase's [Auth](https://firebase.google.com/docs/auth), [Firestore](https://firebase.google.com/docs/firestore), [Storage](https://firebase.google.com/docs/storage), [Hosting](https://firebase.google.com/docs/hosting) and [Cloud Functions](https://firebase.google.com/docs/functions) modules. It also seeds a few sample users and gardens which can be used for testing, see [the seed script](../api/seeders/simple.js).

In a new terminal, run:

```sh
yarn dev
```

This will run a SvelteKit app dev server via Vite (our frontend). SvelteKit also has server-side (backend) capabilities, but for the moment we use it as a pure frontend static site generator via [adapter-static](https://kit.svelte.dev/docs/adapters#supported-environments-static-sites).

If you use VSCode (recommended), you can also execute both commands at the same time using the pre-configured [Run Build Task](https://code.visualstudio.com/Docs/editor/tasks#_typescript-hello-world) command.

### Alternative production-like dev server

`yarn dev` will use Vite's (fast) development server based on native ES modules with hot module replacement (HMR). This is the easiest way to develop the WTMG front-end in most cases.

However, in some cases, it is necesary to work with a built app accessed Firebase Hosting rather than using Vite development server, because this setup behaves more similarly to a production deployment. If you're working on one of the following areas (probably not exhaustive), you may want to follow this course:

- redirect behavior
- SvelteKit adapter-static behavior, prerendering, SEO & meta tags
- Firebase Hosting function rewrites
- browser compatibility testing (built apps are more compatible due to transpilation settings, see [dynamicBuildTarget.js](../plugins/dynamicBuildTarget.js)).

To run this setup:

1. Build the app, this will write the static site to the `dist` folder
   ```sh
   yarn build:demo
   ```
2. Access the built app through the Firebase Hosting Emulator, typically at [http://localhost:4005](http://localhost:4005) which is configured in [firebase.json](../firebase.json) and started along with the other emulators (see above).

This setup does not have a front-end live reload or rebuild, so you need to manually rebuild after each change and manually refresh the site too.

## What can you do now?

Assuming that you did the above, you now have a partially functioning development environment!

You should now be able to:

- access your local WTMG app at [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
- access the [Firebase emulator](https://firebase.google.com/docs/emulator-suite) dashboard UI at [http://127.0.0.1:4001/](http://127.0.0.1:4001/)

If this doesn't work, check your web console logs if your ad blocker is enabled and blocking certain code modules from loading in the development watcher of Vite. Disable the ad blocker on your localhost:5173, or add exception rules.

In the app, you can now try:

1. Creating an account
2. Since you don't have access to the SendGrid variables, no emails will be sent. You can see what emails would have been sent in the Firebase Emulator logs terminal (e.g. to access your email verification link).
3. You can add a test garden and also upload a file into emulated [Storage](https://firebase.google.com/docs/storage) (but because of [this bug](https://github.com/WelcometoMyGarden/welcometomygarden/issues/289) their images won't show up).

Some features are reserved for [members](https://welcometomygarden.org/about-membership). You can make your local test account a member easily (and without connecting to Stripe) by:

1. Opening the Firestore emulator dashboard, the `users` collection (http://localhost:4001/firestore/data/users)
2. Going to your test account's document (as a title, it has your user ID)
3. Adding a boolean field named `superfan`, and setting it to `true`.

## Limitations

The above instructions set up a basic development environment for the core features of WTMG. Here are the limitations & some workarounds:

- Testing SendGrid contact property syncing - except if you create your own SendGrid account.
- In any case, you can't preview/test the email HTML templates used in the backend since those are defined as Dynamic Templates in our SendGrid instance. You can however use mailpit to see which emails are being sent by the backend.
- Work on subscription features - except if you go through the hassle of setting up your own test company on Stripe.
- Log into the Discourse community reserved for members - except if you set up your own Discourse server for testing, see [additional Discourse notes](./discourse.md)

If you have received access to our staging or production Firebase environment, see how to log in your Firebase account & access API services with [these additional notes](./full-access.md).

## Code orientation

The [architecture docs](./architecture.md) contain some notes on the architecture of the app.

## Testing

### Backend unit & integration tests

There are some backend unit and integration tests. The test running procedure is described in [../api/README.md](../api/README.md) -> "Running tests".

### Front-end unit & Firestore rules tests

A very limited number of front-end unit tests & Firestore rules tests are located in `/tests/unit`.

They are run via [Vitest](https://vitest.dev/guide/features.html).

Some Firestore rules unit tests live in `./tests/unit/firestore-rules.test.ts`.

To run them individually from the root directory with a command that first starts up Firebase auth & firestore emulators:

```
echo 'yarn test:unit' > runtests.sh && chmod u+x runtests.sh;
firebase --project demo-test emulators:exec --ui --only auth,firestore ./runtests.sh;
```

Alternatively, run `firebase --project demo-test emulators:start --only auth,firestore` in one shell, and use `vitest` in another, or via the VSCode Vitest extension.

Note: when using the VSCode Vitest extension to run tests, I've noticed Vite will use your default node version. Make sure it aligns with the current `.nvmrc` version using `nvm alias default $(cat .nvmrc)`.

### End-to-end tests

[Playwright](https://playwright.dev/) is set up for end-to-end (e2e) testing, and contains a few tests for core functionality.

After running `yarn install`, also install the testing browsers:

```
npx playwright install
# Use npx, because `yarn dlx` does not respect/execute the currently installed version, but rather downloads the last one
```

And, set up the test configuration `.env.test.local` in the root based on `.env.test.local.example`.

The most convenient procedure to run tests locally is:

1. Start demo Firebase emulators (`yarn firebase:demo`) and the default Vite dev server (`yarn dev`). These two are also the default VSCode Build Task.
2. Run (selected) tests using the VSCode Playwright Extension

Alternatively, the CLI command `yarn test:e2e` can be used too. If demo/dev servers are not running, and tests are configured to use them, then the Playwright config will try to start up these environments first before starting tests.

To develop new tests, you can make use of the [codegen features](https://playwright.dev/docs/codegen#record-at-cursor) and [debugging inspector](https://playwright.dev/docs/debug#playwright-inspector). It's convenient to first start a local (empty) dev environment, and then start debug runs or use "Record at cursor" using the Playwright extension in VSCode, since booting up the dev env takes some time, and Playwright will reuse the existing environment.

See [playwright.config.json](../playwright.config.ts) & [main-flow.spec.ts](./../tests/e2e/main-flow.spec.ts) for more details.

### Production builds

To check if your code won't have compilation issues in production, do a production build locally and preview the result:

```sh
yarn build:prod

# For a quick check of a non-dynamic page, the vite preview server can be used (at localhost:4173)
# note: `vite preview` does not accurately reflect production
# it will return 404s when static page aren't found for a given URL
yarn preview

# For more accurate checks, use the Firebase Hosting emulator (at localhost:4005).
# This uses 200.html for non-found pages, which loads their content client side
# note: it still does not emulate production functions, which is required for rewrite functions
firebase --project prod emulators:start --only hosting
```

You will need the right environment variables for this.

## Deployment

Gitub Actions are set up for a production environment (based off `master`), a beta environment (`beta`) and a staging environment (`staging`). These only deploy the SvelteKit frontend, and not the Cloud Functions in `/api`. See [/api](../api/README.md) to learn how the backend functions are deployed.

The beta environment connects to the production Firebase backend, but has an independent frontend.

The staging environment connects to a separate staging Firebase backend.
