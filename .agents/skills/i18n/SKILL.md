---
name: i18n
description: Helps to understand and manage i18n JSON translation files for the Welcome To My Garden (WTMG) SvelteKit project. Use whenever you need to find, add or update i18n keys.
---

# i18n: Find and edit translation keys

You are helping the user manage i18n JSON translation files for the Welcome To My Garden (WTMG) SvelteKit project.

## File locations

All locale files live in `src/locales/`. Enumerate them using `find src/locales -name "*.json" | head -20` (from the repo root). The currently supported languages are defined in the `SUPPORTED_LANGUAGES` constant in `src/lib/types/general.ts`.

The 5 standard locales are: `en`, `nl`, `de`, `fr`, `es`.

## How to respond to user requests

**If no args are given**, ask the user what they want to do — options include:

- Find where a key is used in the codebase
- Add a new translation key across all locales
- Check which keys are missing in non-English locales
- Edit an existing translation value
- Build a translation worksheet for what changed since a commit (`since.py`)
- Find translation keys that look unused, for review before deletion (`unused.py`)
- Clean up empty `{}` subtrees left behind after removing keys (`prune-empty.py`)

**If args are given**, interpret them as the task. Common forms:

- `add <key-path> "<english value>"` — add a new key to all locale files
- `find <key-path>` — show the current value of a key in all locales
- `missing` — list keys present in en.json but absent in at least one other locale
- `edit <key-path>` — show current values and update translations

## Key rules

1. **Always use the scripts in `scripts/`.** Do not edit the JSON files by hand or with the Edit tool — use the scripts. They preserve the file's `indent=2` formatting, UTF-8 (non-ASCII) characters, and trailing newline, so diffs stay clean.
2. **Edit all locales together.** When adding or editing a key, update all 5 locale files. **Generate the translations yourself** — you don't need to ask the user for them. Only ask if the user has told you about a specific translation source/process to follow. **Follow translation guidelines** in `guidelines.md`.
3. **English is the source of truth.** When checking for missing keys, compare all locales against `en.json`.
4. **Never create a new locale file.** Only edit the locale files that already exist in `src/locales/`. Do not seed or scaffold a `*.json` for a language that isn't there yet (e.g. `pl`) — adding a language is a separate, deliberate step (registering it in `SUPPORTED_LANGUAGES` and wiring it up). When asked to translate into a not-yet-supported language, deliver the translations in the `since.py` CSV worksheet instead (see below), never in a new locale file.
5. **Don't fill in a value that would be identical to English.** `svelte-i18n` falls back to the English value whenever a key is absent from a locale (`fallbackLocale: 'en'` in `src/routes/+layout.ts`). So if the correct translation for a locale is exactly the same string as `en` — a proper name, a do-not-translate term (`WTMG`, `Superfan`, `Welcome To My Garden`), or a value that's `""` in English too — **leave the key absent from that locale** instead of duplicating the English string. This is intentional, not an oversight: don't "fix" it by filling these in when you see them in `missing.py` output, and don't re-add them after they've been removed for this reason, unless the user explicitly asks for full key parity across locales. This only applies when the value would be truly identical — if it differs even slightly (e.g. French adding a space before `?`), it's a real translation and belongs in the file.

## Locating keys in code

Translation keys are referenced via `$_('key.path')` or `$t('key.path')` in Svelte components, and `get(_)('key.path')` or `get(t)('key.path')` in JS/TS files.

To find where a key is used:

```bash
grep -r "key.path" src/
```

Keys can also be dynamically generated (e.g. `root.${dynamicKeyPart}.subkey`), so grep doesn't give a 100% guarantee.

---

## Scripts

The skill ships three Python scripts in the `scripts/` folder next to this file. **Run them from the repo root** so that `src/locales` resolves. They require only the Python 3 standard library. Each accepts `--help` and an optional `--base <dir>` to point at a different locales directory.

Reference the scripts by their path relative to the repo root, e.g. `.agents/skills/i18n/scripts/show.py`.

### `show.py <key-path> [--lang en]` — read a key or section

Prints the value at a dot-notation path for every locale. Works for leaf keys (prints the string) and whole sections (dumps the subtree). Use it to inspect current state before editing, to answer `find <key-path>`, or to see a section's structure before adding keys to it.

```bash
python3 .agents/skills/i18n/scripts/show.py chat.archive      # one key, all locales
python3 .agents/skills/i18n/scripts/show.py chat              # whole section
python3 .agents/skills/i18n/scripts/show.py chat.archive --lang en
```

Missing keys print as `<missing>`.

### `missing.py [--lang nl]` — diff locales against en.json

Reports, for each non-English locale, the keys present in `en.json` but absent there ("missing"), and any keys present there but not in `en.json` ("extra"). Use it for the `missing` request and to audit translation completeness.

Not every "missing" key is a gap to fill — per key rule 5, a key that's intentionally left absent because its translation is identical to English will show up here too. Before translating a reported-missing key, check whether it's actually one of these identical-to-English cases; if so, leave it absent.

```bash
python3 .agents/skills/i18n/scripts/missing.py
python3 .agents/skills/i18n/scripts/missing.py --lang nl
```

### `patch.py [patch.json]` — add or update keys

Reads a JSON patch keyed by locale, whose values mirror the **nested** JSON structure (not dot-notation), and deep-merges it into each locale file — so only the keys you specify are touched and sibling keys are preserved. It works for a single key or a large batch.

Pass the patch as a file argument or pipe it on stdin (a heredoc is usually easiest):

```bash
python3 .agents/skills/i18n/scripts/patch.py << 'EOF'
{
  "en": { "chat": { "archive-confirm": "Are you sure you want to archive this conversation?" } },
  "nl": { "chat": { "archive-confirm": "Weet je zeker dat je dit gesprek wilt archiveren?" } },
  "de": { "chat": { "archive-confirm": "Möchten Sie diese Unterhaltung wirklich archivieren?" } },
  "fr": { "chat": { "archive-confirm": "Voulez-vous vraiment archiver cette conversation ?" } },
  "es": { "chat": { "archive-confirm": "¿Seguro que quieres archivar esta conversación?" } }
}
EOF
```

It prints which keys it touched per file. Nested sections (e.g. `no-archived.title`) and ICU placeholders (`{name}`, `{count}`) are just normal JSON values — include them verbatim.

### `remove.py <key-path> [--lang nl]` — delete a key or section

Deletes the key at a dot-notation path from every locale (or one with `--lang`). Works for a leaf or a whole subtree. Any parent object left empty by the deletion is pruned, so no empty `{}` husks remain.

```bash
python3 .agents/skills/i18n/scripts/remove.py chat.archived-new-activity
python3 .agents/skills/i18n/scripts/remove.py chat.tip            # whole subtree
```

### `rename.py <old-path> <new-path> [--lang nl]` — rename/move a key

Moves a key (leaf or section) to a new dot-notation path in every locale, preserving each locale's own translated value. Creates destination parents as needed and prunes emptied source parents. **It does not touch source code** — grep for `$_('old.path')` / `get(_)('old.path')` references in components and update them yourself.

```bash
# 1. update the component reference(s) first:
grep -rn "chat.archived-new-activity" src/
# 2. then move the key across all locales:
python3 .agents/skills/i18n/scripts/rename.py chat.archived-new-activity chat.open-archive
```

### `since.py <commit> <lang>` — translation worksheet for changes since a commit

Compares English (`en.json`) at a baseline `<commit>` against the current working-tree `en.json` and reports everything that changed **after** that commit (the commit itself is the baseline and is not included). Output is markdown:

- **Added keys** table — keys present now, absent at the baseline.
- **Updated keys** table — keys whose English value changed.
- **Removed keys** list — keys present at the baseline, gone now.

Both tables have three columns: the dot-notation key, the current English value, and a column for `<lang>`. That last column is pre-filled with the locale's **current** value (empty for new keys, the stale value for updated keys). Use it as a worklist: **replace those cells with freshly generated translations** for `<lang>` that follow `guidelines.md`.

Alongside the markdown, the two tables are also written to CSV files in the repo root: `i18n-added-<lang>.csv` and `i18n-updated-<lang>.csv` (columns `key,en,<lang>`).

**Where the finished translations go depends on whether `<lang>` already exists in `src/locales/`:**

- **Existing locale** (one of the 5 standard locales): turn the finished tables into a patch and apply it with `patch.py`. Here the CSVs are scratch — delete them once applied, and don't commit them.
- **New / not-yet-supported language** (e.g. `pl`, with no `pl.json`): `<lang>` does **not** have to be a standard locale — its column just comes back empty. **Write the translations into the CSV worksheet files and leave them there as the deliverable.** Do **NOT** create or seed a `<lang>.json` (or any missing locale file) yourself — adding a new locale to the project is a separate, deliberate step (registering it in `SUPPORTED_LANGUAGES` and wiring it up), not something this worksheet does. The filled CSVs are the output to hand off.

```bash
python3 .agents/skills/i18n/scripts/since.py HEAD~5 fr   # what changed in the last 5 commits, for French
python3 .agents/skills/i18n/scripts/since.py a1b2c3d nl
python3 .agents/skills/i18n/scripts/since.py a1b2c3d pl  # a new language not yet in the repo
```

The script only reads English values for the diff — it does not translate. Generating the `<lang>` translations (including for brand-new languages) and applying them are your job, per the key rules above.

### `unused.py` — find keys that look unused, for review before deletion

Scans the source tree (`--src`, default `src`) for every i18n reference and compares it against the keys defined in `en.json`. It detects references in the call forms `$_(...)`, `$t(...)`, `_(...)`, `t(...)`, `get(_)(...)`, `get(t)(...)`, `transKeyExists(...)`, the subtree accessors `json(...)` and the WTMG helpers `getNode(...)` / `getNodeArray(...)` / `getNodeKeys(...)` / `getNodeChildren(...)` (which mark a path and all its descendants as used), and `{ key: ... }` LocalizedMessage objects, classifying the first argument as:

- **Static literal** (a quoted/back-tick string with no `${...}`) matching the key shape `word.word2-word3.0.word_word` → the key is **used**.
- **Dynamic template** (a back-tick string with `${...}`, e.g. `index.steps.${key}.title`) → turned into a glob to best-effort match candidate keys.
- **Indirect** (a bare expression like `error.key` or `prefix + '.name'`) → listed for manual reasoning; embedded literal keys inside it (e.g. the fallback in `labelKey ?? 'generics.email'`) are still counted as used.

Output is sorted into confidence tiers:

- **Likely unused** — no static or dynamic-template reference. The real removal candidates.
- **Possibly dynamic** — matched only by a dynamic template glob; the interpolation *might* produce them. Verify before touching.
- **Dynamic key templates** and **Indirect references** — listed with locations so you can reason about which keys they actually generate (the glob over-/under-matches, so this human/AI reasoning step is required). It also reports static references that resolve to no key in `en.json` (typos / stale refs).

```bash
python3 .agents/skills/i18n/scripts/unused.py
```

**The script never deletes anything, and "likely unused" is not a guarantee.** Always reason about the dynamic templates and indirect references first (a key built from a runtime variable can be real even with zero static hits), `grep` to confirm, then remove confirmed keys across all locales with `remove.py`.

### `prune-empty.py` — delete empty `{}` subtrees left behind after removals

Removing keys can leave empty husks (`"tabs": {}`, `"three-features": {}`). This finds every object that is recursively empty (a bare `{}` or a tree of nested empty objects) and removes it — but **only when it is empty or absent in every locale**. A section that is `{}` in `fr`/`nl` but still has content in `en` is an untranslated section, not cruft: those inconsistent cases are reported separately and left untouched. Only the top of each empty subtree is removed (e.g. `index.slowby`, not also `index.slowby.banner`).

```bash
python3 .agents/skills/i18n/scripts/prune-empty.py --dry-run   # preview
python3 .agents/skills/i18n/scripts/prune-empty.py             # apply
```

A natural follow-up to `unused.py` + `remove.py`: remove dead keys, then prune the empty parents they leave behind.

---

## Example workflow for adding a new key

User: `add chat.archive-confirm "Are you sure you want to archive this conversation?"`

1. Run `show.py chat` to see what already exists in the `chat` section and confirm the key isn't taken.
2. Write a patch with the new key for all 5 languages — generate the translations yourself — and apply it with `patch.py`.
3. Verify with `show.py chat.archive-confirm`.
4. Report what was added.
