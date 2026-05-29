#!/usr/bin/env python3
"""Report keys that are missing from (or extra in) each locale vs en.json.

en.json is the source of truth. For every other locale this prints the keys
present in en.json but absent there ("missing"), and the keys present there
but not in en.json ("extra").

Usage:
    python3 scripts/missing.py
    python3 scripts/missing.py --lang nl   # check a single locale

Run from the repo root (so that `src/locales` resolves).
"""
import argparse
import json
import os
import sys

BASE = 'src/locales'


def flatten_keys(d, prefix=''):
    keys = set()
    for k, v in d.items():
        full = f'{prefix}.{k}' if prefix else k
        if isinstance(v, dict):
            keys |= flatten_keys(v, full)
        else:
            keys.add(full)
    return keys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lang', help='Limit to a single locale, e.g. nl')
    parser.add_argument('--base', default=BASE, help='Locales directory (default: src/locales)')
    args = parser.parse_args()

    ref_path = os.path.join(args.base, 'en.json')
    if not os.path.isfile(ref_path):
        sys.exit(f'Reference file not found: {ref_path} (run from the repo root)')

    with open(ref_path, encoding='utf-8') as f:
        ref_keys = flatten_keys(json.load(f))

    files = sorted(
        f for f in os.listdir(args.base) if f.endswith('.json') and f != 'en.json'
    )
    if args.lang:
        files = [f for f in files if f[:-5] == args.lang]
        if not files:
            sys.exit(f'No (non-en) locale file for "{args.lang}" in {args.base}')

    for fname in files:
        lang = fname[:-5]
        with open(os.path.join(args.base, fname), encoding='utf-8') as f:
            lang_keys = flatten_keys(json.load(f))
        missing = sorted(ref_keys - lang_keys)
        extra = sorted(lang_keys - ref_keys)
        if not missing and not extra:
            print(f'{lang}: OK')
            continue
        if missing:
            print(f'\n{lang} — missing {len(missing)} keys:')
            for k in missing:
                print(f'  {k}')
        if extra:
            print(f'\n{lang} — extra {len(extra)} keys (not in en):')
            for k in extra:
                print(f'  {k}')


if __name__ == '__main__':
    main()
