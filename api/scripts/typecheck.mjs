// api/ typecheck gate.
//
// Runs `tsc -p jsconfig.json --noEmit` over `api/src` (checkJs) and fails the
// process only on errors that originate in `api/src`.
//
// Why the filter: api's `types.d.ts` legitimately imports a handful of frontend
// model types (e.g. `../../src/lib/models/User`), and a few JSDoc `import()`s
// reach frontend request/response payload types. TypeScript pulls those frontend
// `.ts` files into the program, where they emit false positives — they use
// Vite/SvelteKit-only constructs (`import.meta.env`, `$app/*`, extensionless ESM
// imports) that only resolve under the frontend toolchain. Those files are owned
// and gated by the frontend's own `yarn check`; this gate owns `api/src`.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const apiDir = join(dirname(fileURLToPath(import.meta.url)), '..');
// Resolve the `typescript` that api declares as a devDependency (not the root's),
// so the gate works in CI when only `api/` deps are installed.
const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');

const { stdout } = spawnSync(
  process.execPath,
  [tsc, '-p', join(apiDir, 'jsconfig.json'), '--noEmit', '--pretty', 'false'],
  { cwd: apiDir, encoding: 'utf8' }
);

const lines = (stdout || '').split('\n');
// tsc emits paths relative to cwd (api/). Own errors start with `src/`;
// frontend cross-imports start with `../src/`.
const own = lines.filter((l) => /^src[/\\].*error TS/.test(l));
const foreign = lines.filter((l) => /^\.\.[/\\]src[/\\].*error TS/.test(l));

if (own.length > 0) {
  console.error(own.join('\n'));
}
console.error(
  `\napi/src: ${own.length} error(s)` +
    (foreign.length > 0 ? ` (${foreign.length} frontend cross-import diagnostic(s) ignored)` : '')
);

process.exit(own.length > 0 ? 1 : 0);
