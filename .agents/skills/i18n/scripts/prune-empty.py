#!/usr/bin/env python3
"""Remove empty translation subtrees — objects that are `{}` in EVERY locale.

After deleting keys, parent objects can be left behind as empty husks
(`"tabs": {}`, `"three-features": {}`, …). This finds every object whose
subtree holds no actual string anywhere (an empty `{}`, or a tree of nested
empty objects) and removes it — but only when it is empty (or absent) in
**all** locale files.

The "all locales" guard is the important part: a section that is `{}` in `fr`
and `nl` but still has real content in `en` is NOT cruft — it's an untranslated
section, and removing it would delete that English content. Such inconsistent
empties are reported separately for review and left untouched.

Only the top of each empty subtree is removed (e.g. `index.slowby`, not also
its child `index.slowby.banner`).

Usage:
    python3 scripts/prune-empty.py            # remove them
    python3 scripts/prune-empty.py --dry-run  # just show what would be removed

Run from the repo root (so that `src/locales` resolves).
"""
import argparse
import json
import os
import sys

BASE = 'src/locales'


def is_empty(value):
    """True if value is a dict containing no string content (recursively empty)."""
    return isinstance(value, dict) and all(is_empty(v) for v in value.values())


def get_at(data, keys):
    """Return (value, present) at the dot-path `keys` in `data`."""
    d = data
    for k in keys:
        if not isinstance(d, dict) or k not in d:
            return None, False
        d = d[k]
    return d, True


def empty_paths(data, prefix=''):
    """Yield the dot-path of every object that is recursively empty."""
    if not isinstance(data, dict):
        return
    for k, v in data.items():
        path = f'{prefix}.{k}' if prefix else k
        if is_empty(v):
            yield path
        else:
            yield from empty_paths(v, path)


def pop_at(data, keys):
    """Delete the leaf key at `keys`. Returns True if something was removed."""
    d = data
    for k in keys[:-1]:
        if not isinstance(d, dict) or k not in d:
            return False
        d = d[k]
    if isinstance(d, dict) and keys[-1] in d:
        del d[keys[-1]]
        return True
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be removed without writing any files')
    parser.add_argument('--base', default=BASE, help='Locales directory (default: src/locales)')
    args = parser.parse_args()

    if not os.path.isdir(args.base):
        sys.exit(f'Locales directory not found: {args.base} (run from the repo root)')

    files = sorted(f for f in os.listdir(args.base) if f.endswith('.json'))
    if not files:
        sys.exit(f'No locale files found in {args.base}')

    locales = {}  # lang -> parsed data
    for fname in files:
        with open(os.path.join(args.base, fname), encoding='utf-8') as f:
            locales[fname[:-5]] = json.load(f)

    # Every object that is empty in at least one locale is a candidate.
    candidates = set()
    for data in locales.values():
        candidates.update(empty_paths(data))

    removable = set()
    partial = {}  # path -> {'empty': [langs], 'content': [langs]}
    for path in candidates:
        keys = path.split('.')
        empty_in, content_in = [], []
        for lang, data in locales.items():
            val, present = get_at(data, keys)
            if not present:
                continue
            (empty_in if is_empty(val) else content_in).append(lang)
        if content_in:
            # Empty in some locales, real content in others — leave it, just report.
            partial[path] = {'empty': sorted(empty_in), 'content': sorted(content_in)}
        elif empty_in:
            removable.add(path)

    # Keep only the top of each empty subtree (drop paths whose parent is also removable).
    def parent(p):
        return p.rsplit('.', 1)[0] if '.' in p else None

    maximal = sorted(p for p in removable if parent(p) not in removable)

    print('# Empty-tree cleanup\n')
    print(f'## Empty in all locales — {len(maximal)} subtree(s) {"to remove" if not args.dry_run else "(dry run)"}\n')
    if maximal:
        for path in maximal:
            keys = path.split('.')
            langs = sorted(l for l, d in locales.items() if get_at(d, keys)[1])
            print(f'- `{path}`  (in: {", ".join(langs)})')
    else:
        print('_None._')
    print()

    if partial:
        print(f'## Inconsistent — empty in some locales, content in others — {len(partial)} (left untouched)\n')
        print('Review these: empty where noted, but real content elsewhere. Either translate or remove the content deliberately.\n')
        for path in sorted(partial):
            info = partial[path]
            print(f'- `{path}`  — empty in: {", ".join(info["empty"])}; content in: {", ".join(info["content"])}')
        print()

    if not maximal:
        return
    if args.dry_run:
        print('Dry run — no files changed. Re-run without --dry-run to apply.')
        return

    for lang, data in locales.items():
        removed = [p for p in maximal if pop_at(data, p.split('.'))]
        if not removed:
            print(f'{lang}.json: nothing to remove')
            continue
        with open(os.path.join(args.base, f'{lang}.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'{lang}.json: removed {len(removed)} subtree(s) — {", ".join(removed)}')


if __name__ == '__main__':
    main()
