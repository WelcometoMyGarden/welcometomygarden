# Front-end

The SvelteKit is deployed as a static site to Firebase Hosting.

### Trailing slashes

SvelteKit's native behavior is to [always omit trailing slashes](https://svelte.dev/docs/kit/page-options#trailingSlash) from URLs, which also makes adapter-static build a page like `/explore` as `explore.html` and _not_ `explore/index.html`.

Firebase Hosting needs to be configured to support serving this file structure using [the config `cleanUrls: true`](https://firebase.google.com/docs/hosting/full-config#control_html_extensions), and additionally, `trailingSlash: false`.

### Firebase Hosting Targets

We have two separate Firebase projects (`wtmg-production` and `wtmg-dev`), but they share a single `firebase.json` config file that defines configuration Firebase Hosting targets.

Both `wtmg-production` and `wtmg-dev` have a target named `beta`.

- in `wtmg-dev`, this target is used for `staging.welcometomygarden.org` (see [firebase-hosting-merge-staging](../.github/workflows/firebase-hosting-merge-staging.yml)).
- in `wtmg-production`, this target is used for `beta.welcometomygarden.org`(see [firebase-hosting-merge-beta](../.github/workflows/firebase-hosting-merge-beta.yml)).

`wtmg-production` has a target `production` that is only used for production merges (see [firebase-hosting-merge](../.github/workflows/firebase-hosting-merge.yml)).

**Cache control headers**

We modify our cache-control headers using Firebase Hosting configuration (see https://firebase.google.com/docs/hosting/manage-cache#set_cache-control).

URLs are matched for header modifications _before_ URL rewrites.

To set caching rules for our pages: since we use [`cleanUrls`](https://firebase.google.com/docs/hosting/full-config#headers) (without `.html` suffixes), we can't match HTML pages with a glob rule like `"**/*.html"`, but we have to match their clean URLs instead. It's not easy to reliably match all clean page URLs without exhaustively listing them (the given [RE2 engine](https://github.com/google/re2/wiki/Syntax) is not flexible enough to for example exclude/negative match certain paths). Instead, we modify the default caching behavior, and allow overwrites later.

# Back-end

See [the API docs](../api/README.md) for info on deployment.
