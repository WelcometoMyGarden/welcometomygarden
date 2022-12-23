# Locales

### Caution

Locale files are imported automatically through the combined use of `@rollup/plugin-dynamic-import-vars`, and a virtual module, `plugins/rollup/availableLocales.js`, to retrieve language codes by reading the content of this directory. Only files with `.json` extension are concerned. Consequently, in this directory, `.json` is a flag for locale files.
