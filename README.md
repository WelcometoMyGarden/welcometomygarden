# Welcome To My Garden ![GitHub](https://img.shields.io/github/license/welcometomygarden/welcometomygarden?label=License) [![Translation status](https://hosted.weblate.org/widgets/wtmg/-/svg-badge.svg)](https://hosted.weblate.org/engage/wtmg/)

This repository houses the entire Welcome To My Garden app.

## Contributing

Use [Discussions](https://github.com/WelcometoMyGarden/welcometomygarden/discussions) to discuss feature requests, ideas and questions regarding WTMG.

Problems & bug reports are welcome in [Issues](https://github.com/WelcometoMyGarden/welcometomygarden/issues).

If you want to contribute to the code, read on!

## Get started coding

WTMG has a frontend built with [SvelteKit](https://kit.svelte.dev/), and a backend largely on built on [Firebase](https://firebase.google.com/docs) (see also [/api](./api/)). Several functions also depend on SendGrid (email), and Stripe (subscriptions for our Superfan program).

Firebase [is not our dream ecosystem](https://github.com/WelcometoMyGarden/welcometomygarden/issues/106), but it has supported WTMG's growth uptil now, and is easier to manage for our tiny team of contributors. We might migrate to another system later.

### First, set up your dev environment

- We use the package manager [Yarn](https://yarnpkg.com/getting-started/install), install it if you haven't already.
- Ensure you have [Node](https://nodejs.org/en/download/) 16 installed. Use [nvm](https://github.com/nvm-sh/nvm) if needed. Any version >= 14 should work too, but we are using 16 for development.
- Ensure you have Java >= v11 is installed, preferably the latest LTS version (17). This is required for Firebase's CLI. [Adoptium builds](https://adoptium.net/en-GB/) are helpful.
- Install the [Firebase CLI](https://firebaseopensource.com/projects/firebase/firebase-tools/) globally.

  ```
  yarn global add firebase-tools
  ```

- Install project dependencies, in both the root and `/api` directory.
  ```
  yarn
  cd api && yarn
  ```
- Create environment files from their examples.

  ```
  # For the frontend SvelteKit app

  cp .env.example .env

  # Create a .runtimeconfig.json file in /api, for Firebase Cloud Functions

  cp api/.runtimeconfig-example.json api/.runtimeconfig.json
  ```

### Next, get the dev servers running

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

### What can you do now?

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

Some features are reserved for [Superfans](https://welcometomygarden.org/about-superfan). You can make your local test account a Superfan easily (and without Stripe) by:

1. Opening the Firestore emulator dashboard, the `users` collection (http://localhost:4001/firestore/data/users)
2. Going to your test account's document (as a title, it has your user ID)
3. Adding a boolean field named `superfan`, setting it to `true`.

### What can you NOT immediately do?

- Some static images will be missing. We started dynamically generating responsive images on build-time for some newer components, rather than using one-size static images hosted in a bucket. The source images for this process should be put in `src/lib/assets`, but are not checked into the Git repo. You can download this [Google Drive](https://drive.google.com/drive/folders/1OcaKJa9VoykflvKNv6nH13O0Ho_PcApF?usp=sharing) and manually drop the contents in the mentioned local folder. See the [additional notes](./docs/full-access.md) if you have full access to WTMG's systems to learn about syncing this folder.
- Preview the email HTML, and test contact property syncing functionality - except if you create your own SendGrid account. It's a quick procedure to set up your own free account for testing.
- Work on subscription features - except if you go through the hassle of setting up your own test company on Stripe!
- Log into the Discourse community reserved for Superfans - except if you set up your own Discourse server for testing, see [additional Discourse notes](./docs/discourse.md)

If you have received access to our staging or production Firebase environment, see how to log in your Firebase account & access real API services with [these additional notes](./docs/full-access.md).

### Code orientation

The [architecture docs](./docs/architecture.md) contain some notes on the architecture of the app.

## Testing

[Playwright](https://playwright.dev/) is set up for e2e testing, but does not any tests at the moment.

After running `yarn install`, also install the testing browsers:

```
npx playwright install
```

To check if your code won't have compilation issues in production, do a production build locally and preview the result:

```
yarn build:prod
yarn preview
```

## Deployment

Gitub Actions are set up for a production environment (based off `master`), a beta environment (`beta`) and a staging environment (`staging`). These only deploy the SvelteKit frontend, and not the Cloud Functions in `/api`. See [/api](./api) to learn how the backend functions are deployed.

The beta environment connects to the production Firebase backend, but has an independent frontend.

The staging environment connects to a separate staging Firebase backend.

## Translations

The website is translated through [Hosted Weblate](https://hosted.weblate.org/projects/wtmg/).
You can easily make an account and start translating in their web-environment - no installation required.

[![Translation status](https://hosted.weblate.org/widgets/wtmg/-/multi-auto.svg)](https://hosted.weblate.org/engage/wtmg/)

## License

![GitHub](https://img.shields.io/github/license/welcometomygarden/welcometomygarden?label=License)
