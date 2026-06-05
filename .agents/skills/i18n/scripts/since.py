#!/usr/bin/env python3
"""Diff en.json against a past commit and emit translation worksheets.

Compares English (`en.json`) at a given git commit against the CURRENT
working-tree `en.json` and reports what changed *after* that commit (the
commit itself is the baseline and is not included). It prints, as markdown:

  1. Added keys      — present now, absent at the baseline commit
  2. Updated keys     — present in both, but the English value changed
  3. Removed keys     — present at the baseline commit, absent now

The two tables have three columns: the dot-notation key, the current English
value, and a column for the requested extra language. That last column is
pre-filled with the locale's *current* value for the key (empty for brand-new
keys, the stale value for updated keys) so you can see what still needs work —
then replace those cells with freshly generated translations that follow the
skill's translation guidelines.

The requested language need NOT already exist in the repo: passing a new
language (e.g. `pl`) is fine — its column is simply empty, ready to be filled
with translations into that new language.

Alongside the markdown, the two tables are also written to CSV files in the
current directory (the repo root): `i18n-added-<lang>.csv` and
`i18n-updated-<lang>.csv`.

Usage:
    python3 scripts/since.py <commit> <lang>
    python3 scripts/since.py HEAD~5 fr
    python3 scripts/since.py a1b2c3d pl

Run from the repo root (so that `src/locales` and git resolve).
"""
import argparse
import csv
import json
import os
import subprocess
import sys

BASE = 'src/locales'


def flatten(d, prefix=''):
    """Map every leaf (non-dict) value to its dot-notation path."""
    out = {}
    for k, v in d.items():
        full = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, full))
        else:
            out[full] = v
    return out


def load_at_commit(commit, path):
    """Return the parsed JSON of `path` at `commit`, or {} if it didn't exist."""
    result = subprocess.run(
        ['git', 'show', f'{commit}:{path}'],
        capture_output=True, encoding='utf-8',
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        # A missing file at that commit means everything is "added" — not an error.
        if 'does not exist' in stderr or 'exists on disk, but not in' in stderr:
            return {}
        sys.exit(f'git show {commit}:{path} failed:\n{stderr}')
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError as e:
        sys.exit(f'Could not parse {path} at {commit}: {e}')


def md_cell(value):
    """Render a value safe for a single markdown table cell."""
    if value is None:
        return ''
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    return text.replace('|', '\\|').replace('\n', '<br>')


def md_table(title, rows, lang):
    print(f'## {title} ({len(rows)})\n')
    if not rows:
        print('_None._\n')
        return
    print(f'| Key | English (en) | {lang} |')
    print('| --- | --- | --- |')
    for key, en_val, lang_val in rows:
        print(f'| `{key}` | {md_cell(en_val)} | {md_cell(lang_val)} |')
    print()


def csv_value(value):
    """Render a value for a CSV cell (the csv module handles quoting)."""
    if value is None:
        return ''
    return value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)


def write_csv(filename, rows, lang):
    with open(filename, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['key', 'en', lang])
        for key, en_val, lang_val in rows:
            writer.writerow([key, csv_value(en_val), csv_value(lang_val)])


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('commit', help='Baseline commit hash (exclusive), e.g. HEAD~5 or a1b2c3d')
    parser.add_argument('lang', help='Extra language to produce a worksheet for, e.g. fr (may be a new language)')
    parser.add_argument('--base', default=BASE, help='Locales directory (default: src/locales)')
    args = parser.parse_args()

    if not os.path.isdir(args.base):
        sys.exit(f'Locales directory not found: {args.base} (run from the repo root)')

    en_path = os.path.join(args.base, 'en.json')
    if not os.path.isfile(en_path):
        sys.exit(f'Reference file not found: {en_path} (run from the repo root)')

    with open(en_path, encoding='utf-8') as f:
        current = flatten(json.load(f))
    baseline = flatten(load_at_commit(args.commit, en_path))

    # Current values in the target language, to pre-fill its column.
    lang_path = os.path.join(args.base, f'{args.lang}.json')
    if os.path.isfile(lang_path):
        with open(lang_path, encoding='utf-8') as f:
            lang_values = flatten(json.load(f))
    else:
        lang_values = {}
        print(f'> Note: `{args.lang}` has no locale file yet — its column is empty, '
              f'ready to be filled with new {args.lang} translations.\n')

    added_keys = sorted(k for k in current if k not in baseline)
    updated_keys = sorted(k for k in current if k in baseline and current[k] != baseline[k])
    removed_keys = sorted(k for k in baseline if k not in current)

    added = [(k, current[k], lang_values.get(k)) for k in added_keys]
    updated = [(k, current[k], lang_values.get(k)) for k in updated_keys]

    print(f'# i18n changes since `{args.commit}` — worksheet for `{args.lang}`\n')

    md_table('Added keys', added, args.lang)
    md_table('Updated keys', updated, args.lang)

    print(f'## Removed keys ({len(removed_keys)})\n')
    if removed_keys:
        for k in removed_keys:
            print(f'- `{k}`')
    else:
        print('_None._')
    print()

    added_csv = f'i18n-added-{args.lang}.csv'
    updated_csv = f'i18n-updated-{args.lang}.csv'
    write_csv(added_csv, added, args.lang)
    write_csv(updated_csv, updated, args.lang)
    print(f'Wrote {added_csv} ({len(added)} rows) and {updated_csv} ({len(updated)} rows).')


if __name__ == '__main__':
    main()
