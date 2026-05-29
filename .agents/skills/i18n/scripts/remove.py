#!/usr/bin/env python3
"""Remove a key (leaf or whole section) at a dot-notation path from locales.

Deletes the key from every locale file (or a single one with --lang). After
removal, any parent objects left empty by the deletion are pruned too, so no
empty `{}` husks are left behind.

Usage:
    python3 scripts/remove.py chat.archived-new-activity
    python3 scripts/remove.py chat.tip            # removes the whole subtree
    python3 scripts/remove.py chat.tip --lang nl  # one locale only

Run from the repo root (so that `src/locales` resolves).
"""
import argparse
import json
import os
import sys

BASE = 'src/locales'


def remove_nested(d, keys):
    """Delete keys[-1] under the keys[:-1] path. Returns (removed_value, found)."""
    for k in keys[:-1]:
        if not isinstance(d, dict) or k not in d:
            return None, False
        d = d[k]
    if not isinstance(d, dict) or keys[-1] not in d:
        return None, False
    return d.pop(keys[-1]), True


def prune_empty(d, keys):
    """Walk the parent chain and drop any object emptied by the removal."""
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
    parser.add_argument('key_path', help='Dot-notation key path to remove')
    parser.add_argument('--lang', help='Limit to a single locale, e.g. nl')
    parser.add_argument('--base', default=BASE, help='Locales directory (default: src/locales)')
    args = parser.parse_args()

    if not os.path.isdir(args.base):
        sys.exit(f'Locales directory not found: {args.base} (run from the repo root)')

    keys = args.key_path.split('.')
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
        removed, found = remove_nested(data, keys)
        if not found:
            print(f'{lang}.json: key not present')
            continue
        prune_empty(data, keys)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'{lang}.json: removed {args.key_path} (was {json.dumps(removed, ensure_ascii=False)})')


if __name__ == '__main__':
    main()
