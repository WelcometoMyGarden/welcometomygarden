## Deferred dependency upgrades

### frontend: typescript@v7

At the time of writing, v7 is out of range for every TS-consuming dev dependency we can't also upgrade:

- typescript-eslint peer `typescript >=4.8.4 <6.1.0`
- svelte-check peer `typescript ^5 || ^6`
- svelte2tsx peer `typescript ^4.9.4 || ^5 || ^6`
- svelte-preprocess peer `typescript ^5 || ^6`

### Pinned GH actions runner version

At the time of writing, `ubuntu-26.04` is still flagged _preview_ in actions/runner-images, and ubuntu-latest is still 24.04.

## Risks to watch out for

### mapbox-gl/esm worker support

Currently, we use the Mapbox GL JS `esm` entry point (see https://docs.mapbox.com/mapbox-gl-js/guides/bundler/#esm-entry-point).

This also imports an ES-module worker script (`new Worker(...)`). Used as-is, that would crash on Firefox <= 113 (see [Can I Use](https://caniuse.com/wf-js-modules-workers)), which is why commit 2203989 added a `browser-support.js` sniff.

_However_, in practice, Vite 8 (at the time of writing) transpiles worker scripts into `iife` (https://vite.dev/config/worker-options#worker-format), which replaces most incompatible ES-module syntax/behavior, and which seems to work on Firefox 79+ (previously supported set). So I reverted the browser support sniff in that commit.

According to a Claude Code (Opus 5) analysis, `TileProvider` and `setRTLTextPlugin` still use dynamic `import()` statements in the worker output code which are _not_ transpiled, and would thus fail on Firefox <= 113; but we don't use them.

**The risks**:

- newer `mapbox-gl` versions may start to use more dynamic imports in critical places, and thus breaking Firefox <= 113. Then we'd have to reintroduce the browser-support sniffing.
- newer Vite defaults may default to `worker.format: 'es'`.
