#!/usr/bin/env python3
"""Rename/move a key (leaf or section) to a new dot-notation path in locales.

Each locale keeps its own translated value; only the key path changes. Works
across all locales (or a single one with --lang). Intermediate objects for the
destination are created as needed, and parent objects left empty at the source
are pruned. Does NOT touch source code — update any `$_('old.path')` references
in components yourself (grep for them first).

Usage:
    python3 scripts/rename.py chat.archived-new-activity chat.open-archive
    python3 scripts/rename.py chat.tip.desktop chat.hint.desktop

Run from the repo root (so that `src/locales` resolves).
"""
import argparse
import json
import os
import sys

BASE = 'src/locales'


def pop_nested(d, keys):
    for k in keys[:-1]:
        if not isinstance(d, dict) or k not in d:
            return None, False
        d = d[k]
    if not isinstance(d, dict) or keys[-1] not in d:
        return None, False
    return d.pop(keys[-1]), True


def set_nested(d, keys, value):
    for k in keys[:-1]:
        nxt = d.get(k)
        if not isinstance(nxt, dict):
            nxt = {}
            d[k] = nxt
        d = nxt
    d[keys[-1]] = value


def prune_empty(d, keys):
    for depth in range(len(keys) - 1, 0, -1):
        parent, child_key = d, keys[depth - 1]
        for k in keys[:depth - 1]:
            parent = parent[k]
        if isinstance(parent.get(child_key), dict) and not parent[child_key]:
            del parent[child_key]
        else:
            break


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('old_path', help='Existing dot-notation key path')
    parser.add_argument('new_path', help='New dot-notation key path')
    parser.add_argument('--lang', help='Limit to a single locale, e.g. nl')
    parser.add_argument('--base', default=BASE, help='Locales directory (default: src/locales)')
    args = parser.parse_args()

    if not os.path.isdir(args.base):
        sys.exit(f'Locales directory not found: {args.base} (run from the repo root)')

    old_keys = args.old_path.split('.')
    new_keys = args.new_path.split('.')
    files = sorted(f for f in os.listdir(args.base) if f.endswith('.json'))
    if args.lang:
        files = [f for f in files if f[:-5] == args.lang]
        if not files:
            sys.exit(f'No locale file for "{args.lang}" in {args.base}')

    for fname in files:
        lang = fname[:-5]
        filepath = os.path.join(args.base, fname)
        with open(filepath, encoding='utf-8') as f:
            data = json.load(f)
        value, found = pop_nested(data, old_keys)
        if not found:
            print(f'{lang}.json: source key not present, skipped')
            continue
        prune_empty(data, old_keys)
        set_nested(data, new_keys, value)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'{lang}.json: {args.old_path} -> {args.new_path} (value {json.dumps(value, ensure_ascii=False)})')


if __name__ == '__main__':
    main()
