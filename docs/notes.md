# Misc development notes

- If you get an issues that manifests only in the production build, but not in staging or in dev server, along the lines of `ReferenceError: require is not defined`, this is probably related to the Vite bundling underlying SvelteKit. What fixed it last time was moving some new dependencies (stripe related, possibly with CommonJS syntax in them) into dev-dependencies. Previously we only had `devDependencies` and no `dependencies`... there must be a reason for that! (here is a [vague pointer](https://github.com/vitejs/vite/discussions/1803#discussion-2313924)).
