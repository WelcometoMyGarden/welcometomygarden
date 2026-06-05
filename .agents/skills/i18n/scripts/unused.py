#!/usr/bin/env python3
"""Find translation keys that appear unused, for human review before deletion.

It builds an index of keys *referenced* in the source tree and compares it
against every key defined in `en.json`. Anything defined but never referenced
is a candidate for removal — but because some keys are built dynamically at
runtime, the output is split into confidence tiers and you (or a human) must
confirm before deleting.

How references are detected (deterministic, regex-based):

  * Call forms:  `$_(...)`, `$t(...)`, `_(...)`, `t(...)`,
                 `get(_)(...)`, `get(t)(...)`
  * Object form: `{ key: ... }`  (a LocalizedMessage; may span lines)

For each reference the FIRST argument (or the `key:` value) is classified:

  * Static literal — a quoted string or back-tick string with no `${...}`.
    If it matches the simple key shape `word.word2-word3.0.word_word`
    (segments of [A-Za-z0-9_-], dot-separated), the key is counted as USED.
  * Dynamic template — a back-tick string containing `${...}` interpolation,
    e.g. `index.steps.${key}.title`. These generate a *family* of keys. Each
    is turned into a glob (`${...}` -> one path segment) to best-effort match
    candidate keys, but the regex can over- or under-match, so matched keys
    are flagged "possibly dynamic — verify", NOT silently kept.
  * Indirect — a bare expression like `error.key` or `prefix + '.name'`.
    These can't be resolved statically; they are listed so you can reason
    about them by hand. (Their underlying literal is usually defined at a
    LocalizedMessage construction site and picked up there.)

Output tiers, per key defined in en.json:

  1. USED              — referenced by a static literal (not printed)
  2. POSSIBLY DYNAMIC  — only matched by a dynamic template glob (verify)
  3. LIKELY UNUSED     — neither; the real review/removal candidates

It also lists every dynamic template and indirect reference (so AI/human
reasoning can confirm tier 3 is truly unused), plus any static references
that don't resolve to a key in en.json (typos / stale refs).

The script NEVER deletes anything. Confirm a key is unused, then remove it
with `remove.py`.

Usage:
    python3 scripts/unused.py
    python3 scripts/unused.py --src src --base src/locales

Run from the repo root.
"""
import argparse
import json
import os
import re
import sys

BASE = 'src/locales'
SRC = 'src'
EXTENSIONS = ('.svelte', '.ts', '.js', '.tsx', '.jsx', '.mjs', '.cjs')

# A "simple" i18n key: dot-separated segments of letters, digits, '-' and '_'.
# Numeric segments (e.g. `index.steps.0.title`) are array indices.
KEY_RE = re.compile(r'^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$')

# Leaf reference openers — target a single key. Either `get(_)(` / `get(t)(`,
# or a bare `$_(`/`$t(`/`_(`/`t(` not preceded by an identifier char or '.'
# (so `format(`, `.test(` don't match). `transKeyExists(path)` is a WTMG helper
# (src/lib/util/...) that checks a single key.
CALL_OPENER = re.compile(
    r'get\s*\(\s*[_t]\s*\)\s*\('
    r'|(?<![\w$.])\$?[_t]\s*\('
    r'|(?<![\w$.])transKeyExists\s*\('
)
# Subtree reference openers — these return a whole subtree, so EVERY descendant
# key of the argument path is in use. svelte-i18n's `json(...)`, plus the WTMG
# helpers in src/lib/util/get-node-children.ts: getNode / getNodeArray /
# getNodeKeys / getNodeChildren (all take a dot-path and read its children).
SUBTREE_OPENER = re.compile(
    r'get\s*\(\s*json\s*\)\s*\('
    r'|(?<![\w$.])\$?json\s*\('
    r'|(?<![\w$.])getNode(?:Array|Keys|Children)?\s*\('
)
# `key:` object property (LocalizedMessage), not part of a longer identifier.
KEY_OPENER = re.compile(r'(?<![\w$.])key\s*:\s*')
INTERP_RE = re.compile(r'\$\{[^}]*\}')
# Quoted/back-tick string literals embedded anywhere in an expression.
EMBEDDED_STR_RE = re.compile(r"""(['"`])((?:\\.|(?!\1).)*)\1""")


def flatten(obj, prefix=''):
    """Yield the dot-path of every leaf, recursing into dicts AND lists."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from flatten(v, f'{prefix}.{k}' if prefix else str(k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from flatten(v, f'{prefix}.{i}' if prefix else str(i))
    else:
        yield prefix


def read_string(text, i):
    """text[i] is a quote or back-tick. Return (content, end_index) or (None, i)."""
    quote = text[i]
    j = i + 1
    buf = []
    while j < len(text):
        c = text[j]
        if c == '\\':
            buf.append(text[j:j + 2])
            j += 2
            continue
        if c == quote:
            return ''.join(buf), j + 1
        buf.append(c)
        j += 1
    return None, i  # unterminated


def read_first_arg(text, i):
    """Classify the argument starting at/after index i.

    Returns (kind, value) where kind is 'literal', 'template', 'dynamic',
    or None when there's nothing parseable.
    """
    n = len(text)
    while i < n and text[i] in ' \t\r\n':
        i += 1
    if i >= n:
        return None
    c = text[i]
    if c in '\'"':
        content, _ = read_string(text, i)
        return ('literal', content) if content is not None else None
    if c == '`':
        content, _ = read_string(text, i)
        if content is None:
            return None
        return ('template' if '${' in content else 'literal', content)
    # Bare expression: grab a short snippet up to the next top-level ',' / ')' / newline.
    depth = 0
    j = i
    while j < n:
        ch = text[j]
        if ch in '([{':
            depth += 1
        elif ch in ')]}':
            if depth == 0:
                break
            depth -= 1
        elif ch == ',' and depth == 0:
            break
        elif ch == '\n':
            break
        j += 1
    snippet = text[i:j].strip()
    return ('dynamic', snippet) if snippet else None


def template_to_regex(template):
    """Turn `a.${x}.b.${y}` into a full-match regex.

    Each interior `${...}` matches a single path segment (`[^.]+`). A LEADING
    `${...}` (template starts with interpolation) may absorb a multi-segment
    root key — e.g. `${clustersKey}.${key}.title` where clustersKey itself is
    a dotted path — so it matches one-or-more segments. This deliberately
    over-matches into the "possibly dynamic" tier (safe) rather than missing a
    used key into "likely unused" (unsafe)."""
    out = []
    last = 0
    for m in INTERP_RE.finditer(template):
        out.append(re.escape(template[last:m.start()]))
        out.append(r'[^.]+(?:\.[^.]+)*' if m.start() == 0 else r'[^.]+')
        last = m.end()
    out.append(re.escape(template[last:]))
    try:
        return re.compile('^' + ''.join(out) + '$')
    except re.error:
        return None


def line_of(text, idx):
    return text.count('\n', 0, idx) + 1


def scan_file(path, refs):
    """Populate refs: a dict of sets — static, templates, indirect, missing-candidates."""
    try:
        with open(path, encoding='utf-8') as f:
            text = f.read()
    except (UnicodeDecodeError, OSError):
        return
    rel = path

    def record(arg, idx, subtree=False):
        """subtree=True means a json(...) accessor: the arg path covers all descendants."""
        if arg is None:
            return
        kind, value = arg
        lit_bucket = 'subtree' if subtree else 'static'
        tmpl_bucket = 'subtree_templates' if subtree else 'templates'
        if kind == 'literal':
            if value is not None and KEY_RE.match(value):
                refs[lit_bucket].add(value)
        elif kind == 'template':
            refs[tmpl_bucket].setdefault(value, set()).add(f'{rel}:{line_of(text, idx)}')
        else:  # dynamic / indirect expression
            refs['indirect'].setdefault(value, set()).add(f'{rel}:{line_of(text, idx)}')
            # A literal key can still hide inside the expression, e.g. a fallback
            # `labelKey ?? 'generics.email'` — count those literals as used.
            for q, content in EMBEDDED_STR_RE.findall(value):
                if '${' not in content and KEY_RE.match(content):
                    refs[lit_bucket].add(content)

    for m in CALL_OPENER.finditer(text):
        record(read_first_arg(text, m.end()), m.start())
    for m in SUBTREE_OPENER.finditer(text):
        record(read_first_arg(text, m.end()), m.start(), subtree=True)
    for m in KEY_OPENER.finditer(text):
        arg = read_first_arg(text, m.end())
        # `key:` is a generic property name; only trust literals shaped like a key
        # and back-tick templates that look like a path. Skip bare-expression noise.
        if arg and arg[0] == 'literal' and arg[1] and KEY_RE.match(arg[1]):
            refs['static'].add(arg[1])
        elif arg and arg[0] == 'template' and '.' in arg[1]:
            refs['templates'].setdefault(arg[1], set()).add(f'{rel}:{line_of(text, m.start())}')


def walk_sources(src):
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d != 'node_modules']
        for name in files:
            if name.endswith(EXTENSIONS):
                yield os.path.join(root, name)


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--src', default=SRC, help='Source tree to scan (default: src)')
    parser.add_argument('--base', default=BASE, help='Locales directory (default: src/locales)')
    args = parser.parse_args()

    if not os.path.isdir(args.base):
        sys.exit(f'Locales directory not found: {args.base} (run from the repo root)')
    if not os.path.isdir(args.src):
        sys.exit(f'Source directory not found: {args.src} (run from the repo root)')

    en_path = os.path.join(args.base, 'en.json')
    if not os.path.isfile(en_path):
        sys.exit(f'Reference file not found: {en_path}')
    with open(en_path, encoding='utf-8') as f:
        all_keys = set(flatten(json.load(f)))

    refs = {'static': set(), 'templates': {}, 'indirect': {},
            'subtree': set(), 'subtree_templates': {}}
    for path in walk_sources(args.src):
        scan_file(path, refs)

    # A json(prefix) accessor marks the prefix and every descendant as used.
    def under_subtree(key):
        return any(key == p or key.startswith(p + '.') for p in refs['subtree'])

    used = {k for k in all_keys if k in refs['static'] or under_subtree(k)}
    missing = sorted((refs['static'] | refs['subtree']) - all_keys)
    candidates = all_keys - used

    template_regexes = [(t, template_to_regex(t)) for t in sorted(refs['templates'])]
    subtree_regexes = [(t, template_to_regex(t)) for t in sorted(refs['subtree_templates'])]

    def ancestors(key):
        """key and each of its ancestor paths, e.g. a.b.c -> a, a.b, a.b.c."""
        segs = key.split('.')
        return ['.'.join(segs[:i]) for i in range(1, len(segs) + 1)]

    possibly_dynamic = {}  # key -> [templates that match]
    likely_unused = []
    for key in sorted(candidates):
        matches = [t for t, rx in template_regexes if rx and rx.match(key)]
        # A subtree template covers a key if it matches the key or any ancestor path.
        prefixes = ancestors(key)
        matches += [t for t, rx in subtree_regexes
                    if rx and any(rx.match(p) for p in prefixes)]
        if matches:
            possibly_dynamic[key] = matches
        else:
            likely_unused.append(key)

    print('# Unused i18n key report\n')
    print(f'- Keys defined in `en.json`: {len(all_keys)}')
    print(f'- Statically referenced (used): {len(used)}')
    print(f'- Dynamic templates found: {len(refs["templates"])}')
    print(f'- Subtree references (json/getNode*): {len(refs["subtree"]) + len(refs["subtree_templates"])}')
    print(f'- Indirect references found: {len(refs["indirect"])}')
    print(f'- **Likely unused (review): {len(likely_unused)}**')
    print(f'- Possibly dynamic (verify): {len(possibly_dynamic)}\n')

    print(f'## Likely unused keys — {len(likely_unused)} (no static or dynamic-template reference)\n')
    print('Review these and confirm with `grep` before removing with `remove.py`.\n')
    if likely_unused:
        for k in likely_unused:
            print(f'- `{k}`')
    else:
        print('_None._')
    print()

    print(f'## Possibly dynamic — {len(possibly_dynamic)} (matched only by a dynamic template)\n')
    print('A template glob matched these; confirm the interpolation really produces them.\n')
    if possibly_dynamic:
        for k, tmpls in possibly_dynamic.items():
            print(f'- `{k}`  ←  {", ".join(f"`{t}`" for t in tmpls)}')
    else:
        print('_None._')
    print()

    print(f'## Dynamic key templates — {len(refs["templates"])} (reason about their coverage)\n')
    if refs['templates']:
        for t in sorted(refs['templates']):
            locs = ', '.join(sorted(refs['templates'][t]))
            print(f'- `{t}`  ({locs})')
    else:
        print('_None._')
    print()

    n_subtree = len(refs['subtree']) + len(refs['subtree_templates'])
    print(f'## Subtree references (json / getNode*) — {n_subtree} (cover the path and all descendants)\n')
    if n_subtree:
        for p in sorted(refs['subtree']):
            print(f'- `{p}` (static)')
        for t in sorted(refs['subtree_templates']):
            locs = ', '.join(sorted(refs['subtree_templates'][t]))
            print(f'- `{t}` (template — {locs})')
    else:
        print('_None._')
    print()

    print(f'## Indirect references — {len(refs["indirect"])} (resolved at runtime; reason manually)\n')
    if refs['indirect']:
        for expr in sorted(refs['indirect']):
            locs = ', '.join(sorted(refs['indirect'][expr]))
            print(f'- `{expr}`  ({locs})')
    else:
        print('_None._')
    print()

    print(f'## Referenced but missing from en.json — {len(missing)} (typos / stale / non-i18n `key:`)\n')
    if missing:
        for k in missing:
            print(f'- `{k}`')
    else:
        print('_None._')
    print()


if __name__ == '__main__':
    main()
