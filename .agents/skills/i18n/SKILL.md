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

**If args are given**, interpret them as the task. Common forms:

- `add <key-path> "<english value>"` — add a new key to all locale files
- `find <key-path>` — show the current value of a key in all locales
- `missing` — list keys present in en.json but absent in at least one other locale
- `edit <key-path>` — show current values and update translations

## Key rules

1. **Always use the scripts in `scripts/`.** Do not edit the JSON files by hand or with the Edit tool — use the scripts. They preserve the file's `indent=2` formatting, UTF-8 (non-ASCII) characters, and trailing newline, so diffs stay clean.
2. **Edit all locales together.** When adding or editing a key, update all 5 locale files. **Generate the translations yourself** — you don't need to ask the user for them. Only ask if the user has told you about a specific translation source/process to follow.
3. **English is the source of truth.** When checking for missing keys, compare all locales against `en.json`.

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

---

## Example workflow for adding a new key

User: `add chat.archive-confirm "Are you sure you want to archive this conversation?"`

1. Run `show.py chat` to see what already exists in the `chat` section and confirm the key isn't taken.
2. Write a patch with the new key for all 5 languages — generate the translations yourself — and apply it with `patch.py`.
3. Verify with `show.py chat.archive-confirm`.
4. Report what was added.
