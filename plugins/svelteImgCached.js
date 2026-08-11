// @ts-nocheck — adapted upstream drop-in plugin (vendored from a svelte-img/vite-imagetools
// replacement). Kept close to its source for easy diffing against the reference; the loose
// library-glue typings here are intentionally not checked as app code (checkJs is on repo-wide).
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { imagetools as baseImagetools, pictureFormat } from 'vite-imagetools';
import sharp from 'sharp';

/**
 * Drop-in replacement for `@zerodevx/svelte-img/vite`.
 *
 * Differences from upstream:
 *  1. The LQIP is derived from the SOURCE file and cached on disk, keyed by
 *     (source content hash, lqip width). Upstream derives it from the largest
 *     generated variant via `metadatas[].image`, which (a) is `undefined` on
 *     vite-imagetools 7-10 and crashes, and (b) costs a full image decode on
 *     every build even when every variant is a cache hit.
 *  2. Optional build-time profiling of transform cost and cache hit rate.
 *
 * The runtime half of svelte-img (`<Img>`, `FxReveal`, `FxParallax`) is
 * untouched — this only replaces the Vite plugin, and emits the same
 * `{ sources, img: { src, w, h, lqip } }` shape it consumes.
 */

const ctx = new AsyncLocalStorage();

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 32);

async function writeAtomic(path, data) {
  // Unique temp per write: the pid alone collides when two concurrent transforms
  // resolve the same cache key (same source bytes + lqip width) in one build, which
  // races the rename() and can throw ENOENT — a rare cold-build failure. The random
  // suffix makes each writer's temp file distinct; the final rename harmlessly wins.
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, path);
}

/** LQIP generation with its own content-addressed disk cache. */
function makeLqipCache(dir) {
  mkdirSync(dir, { recursive: true });
  const mem = new Map();

  return async function lqipFor(pathname, width, stats) {
    const srcBytes = await readFile(pathname);
    const key = `${sha(srcBytes)}-lqip${width}`;
    if (mem.has(key)) {
      stats.lqipMemHits++;
      return mem.get(key);
    }

    const file = `${dir}/${key}.txt`;
    if ((statSync(file, { throwIfNoEntry: false })?.size ?? 0) > 0) {
      const val = (await readFile(file, 'utf8')).trim();
      mem.set(key, val);
      stats.lqipDiskHits++;
      return val;
    }

    const t0 = performance.now();
    let val;
    if (width > 1) {
      const buf = await sharp(srcBytes)
        .rotate() // honour EXIF orientation, as the real variants do
        .resize({ width })
        .toFormat('webp', { quality: 20 })
        .toBuffer();
      val = buf.toString('base64');
    } else {
      const { dominant } = await sharp(srcBytes).stats();
      const { r, g, b } = dominant;
      val = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    }
    stats.lqipMisses++;
    stats.lqipMs += performance.now() - t0;

    mem.set(key, val);
    await writeAtomic(file, val);
    return val;
  };
}

function makeRun(lqipFor, stats) {
  return function run(cfg) {
    return async function (metadatas) {
      const pic = pictureFormat()(metadatas);
      const lqip = (cfg && parseInt(cfg)) ?? 16;
      if (lqip) {
        const pathname = ctx.getStore()?.pathname;
        if (pathname) {
          pic.img.lqip = await lqipFor(pathname, lqip, stats);
        } else {
          // fall back to upstream behaviour if we somehow lost the context
          const entry = metadatas.find((i) => i.src === pic.img.src);
          if (entry?.image) {
            if (lqip > 1) {
              const buf = await entry.image
                .clone()
                .resize({ width: lqip })
                .toFormat('webp', { quality: 20 })
                .toBuffer();
              pic.img.lqip = buf.toString('base64');
            } else {
              const { r, g, b } = (await entry.image.stats()).dominant;
              pic.img.lqip = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
            }
          }
        }
      }
      return pic;
    };
  };
}

export function imagetools({
  profiles = {},
  runDefaultDirectives = new URLSearchParams('w=480;1024;1920&format=avif;webp;jpg'),
  defaultDirectives = new URLSearchParams(),
  exclude = '{build,dist,node_modules}/**/*',
  extendOutputFormats = (i) => i,
  cache,
  profile = false,
  ...rest
} = {}) {
  const cacheDir = cache?.dir ?? './node_modules/.cache/imagetools';
  const lqipDir = `${cacheDir}/lqip`;

  const stats = {
    rows: [],
    lqipMemHits: 0,
    lqipDiskHits: 0,
    lqipMisses: 0,
    lqipMs: 0
  };

  const lqipFor = makeLqipCache(lqipDir);
  const run = makeRun(lqipFor, stats);

  const dict = { run: runDefaultDirectives, ...profiles };

  const plugin = baseImagetools({
    defaultDirectives: (url, lazyMeta) => {
      const key = url.searchParams.get('as')?.split(':')[0];
      if (Object.keys(dict).includes(key)) return dict[key];
      return typeof defaultDirectives === 'function'
        ? defaultDirectives(url, lazyMeta)
        : defaultDirectives;
    },
    extendOutputFormats: (builtins) => ({
      ...extendOutputFormats(builtins),
      ...Object.keys(dict).reduce((a, c) => ({ ...a, [c]: run }), {})
    }),
    exclude,
    cache,
    ...rest
  });

  // ---- wrap load: provide source pathname to `run`, and optionally profile ----
  const orig = plugin.load;
  const isObjectForm = typeof orig === 'object' && orig !== null;
  const handler = isObjectForm ? orig.handler : orig;

  const snapshot = () => {
    try {
      return readdirSync(cacheDir).length;
    } catch {
      return 0;
    }
  };

  async function wrappedLoad(id, ...args) {
    const url = new URL(id.replace(/#/g, '%23'), 'file://');
    const pathname = decodeURIComponent(url.pathname);
    const before = profile ? snapshot() : 0;
    const t0 = profile ? performance.now() : 0;

    // ---- normalise the `.jpg` -> `.jpeg` filename flip on cache hits -------
    // imagetools 7-10 rebuild the format from sharp when restoring a cached
    // variant, and sharp reports `jpeg` where the directive said `jpg`. That
    // silently changes emitted asset filenames between a cold and a warm build.
    // Fixed upstream in 11.0.0; patched here for older versions.
    const asKey = url.searchParams.get('as')?.split(':')[0];
    const effective = new URLSearchParams({
      ...Object.fromEntries(dict[asKey] ?? new URLSearchParams()),
      ...Object.fromEntries(url.searchParams)
    });
    const formats = (effective.get('format') ?? '').split(';');
    const wantsJpg = formats.includes('jpg') && !formats.includes('jpeg');

    const pluginCtx = wantsJpg
      ? Object.create(this, {
          emitFile: {
            value: (opts) =>
              this.emitFile(
                opts?.name?.endsWith('.jpeg')
                  ? { ...opts, name: opts.name.slice(0, -5) + '.jpg' }
                  : opts
              )
          }
        })
      : this;

    const result = await ctx.run({ pathname }, () => handler.call(pluginCtx, id, ...args));

    if (profile && result != null) {
      stats.rows.push({
        id: id.replace(process.cwd(), '.'),
        ms: performance.now() - t0,
        written: snapshot() - before
      });
    }
    return result;
  }

  return {
    ...plugin,
    name: 'svelte-img-cached',
    load: isObjectForm ? { ...orig, handler: wrappedLoad } : wrappedLoad,
    buildEnd(...args) {
      if (profile) report(stats, cacheDir);
      return plugin.buildEnd?.apply(this, args);
    }
  };
}

const fmt = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`);

function report(stats, cacheDir) {
  const { rows } = stats;
  if (!rows.length) return console.log('\n[svelte-img] no image imports processed\n');

  const total = rows.reduce((a, r) => a + r.ms, 0);
  const misses = rows.filter((r) => r.written > 0);

  let files = 0;
  let bytes = 0;
  try {
    for (const f of readdirSync(cacheDir)) {
      const s = statSync(`${cacheDir}/${f}`);
      if (s.isFile()) {
        files++;
        bytes += s.size;
      }
    }
  } catch {
    /* empty */
  }

  console.log('\n\x1b[1m[svelte-img] image transform report\x1b[0m');
  console.log(`  imports              : ${rows.length}`);
  console.log(
    `  total time in load   : \x1b[1m${fmt(total)}\x1b[0m  (mean ${fmt(total / rows.length)})`
  );
  console.log(
    `  variant cache        : ${files} files, ${(bytes / 1e6).toFixed(1)} MB @ ${cacheDir}`
  );
  console.log(`  imports needing work : ${misses.length} / ${rows.length}`);
  console.log(
    `  lqip                 : ${stats.lqipDiskHits} disk hits, ${stats.lqipMemHits} mem hits, ` +
      `${stats.lqipMisses} generated (${fmt(stats.lqipMs)})`
  );

  const slow = [...rows].sort((a, b) => b.ms - a.ms).slice(0, 10);
  console.log('\n  slowest imports:');
  for (const r of slow) {
    const tag = r.written > 0 ? `\x1b[33mMISS\x1b[0m` : `\x1b[32mHIT \x1b[0m`;
    console.log(`    ${fmt(r.ms).padStart(8)}  ${tag}  ${r.id}`);
  }
  console.log('');
}
