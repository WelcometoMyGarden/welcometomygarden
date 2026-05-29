#!/usr/bin/env python3
"""Add or update i18n keys across locales from a JSON patch.

The patch is a JSON object keyed by locale, whose values mirror the nested
structure of the locale files (NOT dot-notation). Only the keys present in
the patch are touched; existing sibling keys are preserved (deep merge).

Patch shape:
    {
      "en": { "chat": { "new-key": "New value" } },
      "nl": { "chat": { "new-key": "Nieuwe waarde" } },
      ...one entry per locale you want to write...
    }

The patch may be passed as a file argument or piped on stdin:

    python3 scripts/patch.py patch.json
    python3 scripts/patch.py < patch.json
    python3 scripts/patch.py << 'EOF'
    { "en": { "chat": { "new-key": "New value" } } }
    EOF

Run from the repo root (so that `src/locales` resolves).
"""
import argparse
import json
import os
import sys

BASE = 'src/locales'


def deep_update(base, updates):
    """Recursively merge `updates` into `base`. Returns list of touched leaf paths."""
    touched = []
    for k, v in updates.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            touched += [f'{k}.{p}' for p in deep_update(base[k], v)]
        else:
            base[k] = v
            touched.append(k)
    return touched


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('patch', nargs='?', help='Patch JSON file (omit to read stdin)')
    parser.add_argument('--base', default=BASE, help='Locales directory (default: src/locales)')
    args = parser.parse_args()

    if not os.path.isdir(args.base):
        sys.exit(f'Locales directory not found: {args.base} (run from the repo root)')

    raw = open(args.patch, encoding='utf-8').read() if args.patch else sys.stdin.read()
    try:
        patch = json.loads(raw)
    except json.JSONDecodeError as e:
        sys.exit(f'Invalid patch JSON: {e}')

    if not isinstance(patch, dict):
        sys.exit('Patch must be a JSON object keyed by locale.')

    for lang, lang_updates in patch.items():
        filepath = os.path.join(args.base, f'{lang}.json')
        if not os.path.isfile(filepath):
            sys.exit(f'No locale file for "{lang}": {filepath}')
        with open(filepath, encoding='utf-8') as f:
            data = json.load(f)
        touched = deep_update(data, lang_updates)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'{lang}.json: updated {len(touched)} key(s) — {", ".join(touched)}')


if __name__ == '__main__':
    main()
