#!/usr/bin/env python3
"""Show the value at a dot-notation key path across all locales.

Works for both leaf keys (prints the translated string per locale) and
sections (prints the whole subtree per locale).

Usage:
    python3 scripts/show.py chat.archive
    python3 scripts/show.py chat            # dump the whole `chat` section
    python3 scripts/show.py chat.archive --lang en   # single locale only

Run from the repo root (so that `src/locales` resolves).
"""
import argparse
import json
import os
import sys

BASE = 'src/locales'


def get_nested(d, key_path):
    for k in key_path.split('.'):
        if not isinstance(d, dict) or k not in d:
            return None, False
        d = d[k]
    return d, True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('key_path', help='Dot-notation key path, e.g. chat.archive')
    parser.add_argument('--lang', help='Limit to a single locale, e.g. en')
    parser.add_argument('--base', default=BASE, help='Locales directory (default: src/locales)')
    args = parser.parse_args()

    if not os.path.isdir(args.base):
        sys.exit(f'Locales directory not found: {args.base} (run from the repo root)')

    files = sorted(f for f in os.listdir(args.base) if f.endswith('.json'))
    if args.lang:
        files = [f for f in files if f[:-5] == args.lang]
        if not files:
            sys.exit(f'No locale file for "{args.lang}" in {args.base}')

    for fname in files:
        lang = fname[:-5]
        with open(os.path.join(args.base, fname), encoding='utf-8') as f:
            data = json.load(f)
        val, found = get_nested(data, args.key_path)
        if not found:
            print(f'{lang}: <missing>')
        elif isinstance(val, (dict, list)):
            print(f'{lang}:')
            print(json.dumps(val, ensure_ascii=False, indent=2))
        else:
            print(f'{lang}: {json.dumps(val, ensure_ascii=False)}')


if __name__ == '__main__':
    main()
