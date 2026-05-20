To reduce the risk of supply chain attacks, we've set some non-standard configuration options for Yarn in `.yarnrc.yml`.

## Blocking dependency install scripts by default

[`enableScripts: false`](https://yarnpkg.com/configuration/yarnrc#enableScripts).

Via research guided by Opus 4.7, I've concluded that the following (transitive) dependencies run scripts:

**Front-end**

| Packages                                | Verdict       | Why                                     |
| --------------------------------------- | ------------- | --------------------------------------- |
| svelte-preprocess, es5-next, protobufjs | leave blocked | prints inessential messages or warnings |
| esbuild                                 | allow         | sets up native binary                   |
| sharp                                   | allow         | might build a native binary             |

**Back-end**: in the back-end, there are currently no deps which run (post)install scripts.

The allowed deps are allowed inside `package.json` with `dependenciesMeta: { "packageName": { "built": true } }`

### Checking for required install scripts in the future

To check which deps have `postinstall`, `preinstall` or `install` scripts, we first tried `yarn info`-based methods, but those did not return script info.
The method we used was inspecting the `.zip`s in the local package cache in the following way:

```sh
for zip in .yarn/cache/*.zip; do
  unzip -p "$zip" 'node_modules/*/package.json' 2>/dev/null \
    | jq -r 'select(.scripts.postinstall or .scripts.preinstall or .scripts.install)
             | .name' 2>/dev/null
done | sort -u
```

This also returns `package.json` inside internal projects within the packages (such a test fixtures), which are likely false positives. Examples: `@firebase/util`, `@sentry/cli`.

## Minimal dependency age gate for updates

We also set the [`npmMinimalAgeGate`](https://yarnpkg.com/configuration/yarnrc#npmMinimalAgeGate) to 7 days.
