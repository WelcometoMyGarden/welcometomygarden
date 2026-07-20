# Front-end

The SvelteKit is deployed as a static site to Firebase Hosting. A GitHub Action normally takes care of this, but if GitHub Actions are down (happens regularly as of late!), you can also deploy on your machine easily. See below for instructi

### Trailing slashes

SvelteKit's native behavior is to [always omit trailing slashes](https://svelte.dev/docs/kit/page-options#trailingSlash) from URLs, which also makes adapter-static build a page like `/explore` as `explore.html` and _not_ `explore/index.html`.

Firebase Hosting needs to be configured to support serving this file structure using [the config `cleanUrls: true`](https://firebase.google.com/docs/hosting/full-config#control_html_extensions), and additionally, `trailingSlash: false`.

### Firebase Hosting Targets

We have two separate Firebase projects (`wtmg-production` and `wtmg-dev`), but they share a single `firebase.json` config file that defines configuration Firebase Hosting targets.

Both `wtmg-production` and `wtmg-dev` have a target named `beta`.

- in `wtmg-dev`, this target is used for `staging.welcometomygarden.org` (see [firebase-hosting-merge-staging](../.github/workflows/firebase-hosting-merge-staging.yml)).
- in `wtmg-production`, this target is used for `beta.welcometomygarden.org`(see [firebase-hosting-merge-beta](../.github/workflows/firebase-hosting-merge-beta.yml)).

`wtmg-production` has a target `production` that is only used for production merges (see [firebase-hosting-merge](../.github/workflows/firebase-hosting-merge.yml)).

The `production` target is not used in the `wtmg-dev` (see [`.firebaserc`](../.firebaserc)). This might result in the failure of some `firebase` commands that try to deploy to all targets by default. This is why the target is explicitly mentioned in some of the following commands.

**Cache control headers**

We modify our cache-control headers using Firebase Hosting configuration (see https://firebase.google.com/docs/hosting/manage-cache#set_cache-control).

URLs are matched for header modifications _before_ URL rewrites.

To set caching rules for our pages: since we use [`cleanUrls`](https://firebase.google.com/docs/hosting/full-config#headers) (without `.html` suffixes), we can't match HTML pages with a glob rule like `"**/*.html"`, but we have to match their clean URLs instead. It's not easy to reliably match all clean page URLs without exhaustively listing them (the given [RE2 engine](https://github.com/google/re2/wiki/Syntax) is not flexible enough to for example exclude/negative match certain paths). Instead, we modify the default caching behavior, and allow overwrites later.

### Assets

Currently, most media assets used by the front-end are not committed to this repo and live in a storage bucket. They need to be deployed separately.

The [full access](./full-access.md) docs also contains instructions for this.

### Manual deploy

The steps to deploy manually follow [the Firebase guide](https://firebase.google.com/docs/hosting/test-preview-deploy#deploy-project-directory-to-live) and [example commands for handling targets & channels](https://firebase.google.com/docs/hosting/multisites#cli-commands-with-deploy-targets), in accordance with our configruation.

**Note** that the static site will be built with `.env.*[.local]` environment files available in the root. **These may have been modified for local development purposes.** Ensure they are appropriate for your target environment before proceeding.

Some variables required for the Github CI environment are not required locally, for example, those exclusively used to set up the source (`prepare-source`).

Run the applicable command from the root:

```sh
# For a staging preview channel deploy
yarn build:staging
# The expires param is optional, the max is 30d, the default is 7d (2w doesn't work for some reason, 14d does)
# --only beta is important, otherwise it will try to deploy to prod-dummy too which does not exist
firebase --project staging hosting:channel:deploy new-awesome-feature --only beta [--expires 7d]

# For staging
yarn build:staging
firebase --project staging deploy --only hosting:beta

# For beta - see staging preview from before
vite build --mode beta
firebase --project prod hosting:channel:deploy new-awesome-feature --only beta [--expires 7d]

# For production
yarn build:prod
firebase --project prod deploy --only hosting:production
```

Note: this does not include instructions for the production `beta` target. For this, a new Vite mode with appropriate env vars reflecting the GitHub config needs to be created.

# Back-end

See [the API docs](../api/README.md) for info on deployment.
