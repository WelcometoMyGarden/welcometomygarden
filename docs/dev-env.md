# WTMG Development Environment

**Heads-up:** this guide may not be sufficient to produce a working development environment, as it has not been tested for many months in which the app has changed significantly. If you want to contribute and experience any problems, feel free to file an issue.

## Prerequisites

- [Node](https://nodejs.org/en/download/) v20. Using [nvm](https://github.com/nvm-sh/nvm) is recommended. At the time of writing, you need v20.11.0 specifically to prevent a https issue in the dev server. The project probably works with v18 still, and might work with other older or newer versions too, but these aren't tested.
- Java runtime environment >= v11, preferably the latest LTS version (17). This is required for Firebase's CLI. [Adoptium builds](https://adoptium.net/en-GB/) are helpful.
- The [Firebase CLI](https://firebaseopensource.com/projects/firebase/firebase-tools/) and [Yarn](https://yarnpkg.com/getting-started/install), installed globally via npm. The global npm Yarn install will install a v1 ("Classic") version, but this version will replace itself with a locked version checked into this repository (3.5.0 at the time of writing) using the `.yarnrc.yml` configuration:
  ```bash
  npm i -g firebase-tools yarn
  ```
- Optional: [Mailpit](https://mailpit.axllent.org/) for testing emails locally (to some extent)

## Project setup

1. Install project dependencies, in both the root and `/api` directory.

   ```bash
   yarn
   cd api && yarn && cd -
   ```

2. Create environment files from their examples.

   ```bash
   # For the frontend SvelteKit app. This follows the way Vite env files are set up: https://vitejs.dev/guide/env-and-mode.html#modes

   cp .env.example .env.development.local

   # For the backend Firebase Cloud Functions local emulator

   cd api && cp .env.example .env.local && cd -
   ```

## Next, get the dev servers running

Start all Firebase emulators:

```
yarn firebase:demo
```

This will locally emulate our "backend": Firebase's [Auth](https://firebase.google.com/docs/auth), [Firestore](https://firebase.google.com/docs/firestore), [Storage](https://firebase.google.com/docs/storage), [Hosting](https://firebase.google.com/docs/hosting) and [Cloud Functions](https://firebase.google.com/docs/functions) modules.

In a new terminal, run:

```
yarn dev
```

This will run a SvelteKit app dev server via Vite (our frontend). SvelteKit also has server-side (backend) capabilities, but for the moment we use it as a pure frontend static site generator via [adapter-static](https://kit.svelte.dev/docs/adapters#supported-environments-static-sites).

If you use VSCode (recommended), you can also execute both commands at the same time using the pre-configured [Run Build Task](https://code.visualstudio.com/Docs/editor/tasks#_typescript-hello-world) command.

There are several other development scripts available in `package.json`, for example, `yarn firebase:demo-seed` will add some testing data to the dev env upon startup.

⚠️ **To test some features locally, you will need to use the Firebase Hosting servers instead.** `yarn dev` will use Vite's (fast) development server based on native ES modules. This will always run the latest code, and is sufficient for nearly all development. However, at the moment of writing, there is one feature (handleUnsubscribe) which requires the use of the dynamic rewrite capabilities of Firebase Hosting's servers. If you need to debug a production error, it might also be good to work with a built app via Hosting rather than the Vite development server, because it is closer to the production code. When you run the Firebase emulators at the same time, you will start up the Firebase Hosting emulator, which is configured in [firebase.json](../firebase.json). It hosts files from [dist](../dist/) and runs a separate server for each Firebase target. The front-end codebase **has to be built manually** (for which Vite uses rollup) to overwrite the dist build, for example using `yarn build:demo`. There might be some slight behavioral differences between a Vite development server and production build.
.

## What can you do now?

Assuming that you did the above, you now have a partially functioning development environment!

You should now be able to:

- access your local WTMG app at [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
- access the [Firebase emulator](https://firebase.google.com/docs/emulator-suite) dashboard UI should be [http://127.0.0.1:4001/](http://127.0.0.1:4001/)

If this doesn't work, check your web console logs if your ad blocker is enabled and blocking certain code modules from loading in the development watcher of Vite. Disable the ad blocker on your localhost:5173, or add exception rules.

In the app, you can now try:

1. Creating an account
2. Since you don't have access to the SendGrid variables, no emails will be sent. You can see what emails would have been sent in the Firebase Emulator logs terminal (e.g. to access your email verification link).
3. You can add a test garden and also upload a file into emulated [Storage](https://firebase.google.com/docs/storage) (but because of [this bug](https://github.com/WelcometoMyGarden/welcometomygarden/issues/289) their images won't show up).

⚠️ Importantly, with the default demo development environment, the **map will be empty/broken** by default. That's because you're missing an API token. If you [get your own Mapbox Access Token](https://docs.mapbox.com/help/getting-started/#how-to-use-mapbox) and fill it in in `.env`, most basic features of the map should work. You may need to restart the Vite server. **Mapbox asks for payment details to get a token, but has a free tier that should be sufficient for your local development needs.** If you really dislike this, [upvote the issue to support an open & free alternative](https://github.com/WelcometoMyGarden/welcometomygarden/issues/308).

Some features are reserved for [members](https://welcometomygarden.org/about-membership). You can make your local test account a member easily (and without Stripe) by:

1. Opening the Firestore emulator dashboard, the `users` collection (http://localhost:4001/firestore/data/users)
2. Going to your test account's document (as a title, it has your user ID)
3. Adding a boolean field named `superfan`, setting it to `true`.

## What can you NOT immediately do?

- Some static images will be missing. We started dynamically generating responsive images on build-time for some newer components, rather than using one-size static images hosted in a bucket. The source images for this process should be put in `src/lib/assets`, but are not checked into the Git repo. You can download this [Google Drive](https://drive.google.com/drive/folders/1OcaKJa9VoykflvKNv6nH13O0Ho_PcApF?usp=sharing) and manually drop the contents in the mentioned local folder. See the [additional notes](./full-access.md) if you have full access to WTMG's systems to learn about syncing this folder.
- Preview the email HTML, and test contact property syncing functionality - except if you create your own SendGrid account. It's a quick procedure to set up your own free account for testing.
- Work on subscription features - except if you go through the hassle of setting up your own test company on Stripe!
- Log into the Discourse community reserved for members - except if you set up your own Discourse server for testing, see [additional Discourse notes](./discourse.md)

If you have received access to our staging or production Firebase environment, see how to log in your Firebase account & access real API services with [these additional notes](./full-access.md).

## Code orientation

The [architecture docs](./architecture.md) contain some notes on the architecture of the app.

## Testing

### Backend unit & integration tests

There are some backend unit and integration tests. The test running procedure is described in [../api/README.md](../api/README.md) -> "Running tests".

### Front-end unit & Firestore rules tests

Some firestore rules unit tests live in `./tests/unit/firestore-rules.test.ts`. To run them from the root directory:

```
cd api && echo 'cd .. && yarn test:unit' > runtests.sh && firebase --project demo-test emulators:exec --ui --only auth,firestore ./runtests.sh; cd -
```

### E2E tests

[Playwright](https://playwright.dev/) is set up for e2e testing, and contains a few tests for core functionality.

After running `yarn install`, also install the testing browsers:

```
yarn dlx playwright install
```

To run the tests, use the VSCode Playwright Extension, or `yarn test:e2e`.

To change whether the tests should start a local dev env or target staging, change the TEST_ENV variable in .env.test.local.

See [playwright.config.json](../playwright.config.ts) & [main-flow.spec.ts](./../tests/e2e/main-flow.spec.ts) for more details.

### Production builds

To check if your code won't have compilation issues in production, do a production build locally and preview the result:

```
yarn build:prod
yarn preview
```

You will need the right environment variables for this.

## Deployment

Gitub Actions are set up for a production environment (based off `master`), a beta environment (`beta`) and a staging environment (`staging`). These only deploy the SvelteKit frontend, and not the Cloud Functions in `/api`. See [/api](../api/README.md) to learn how the backend functions are deployed.

The beta environment connects to the production Firebase backend, but has an independent frontend.

The staging environment connects to a separate staging Firebase backend.
