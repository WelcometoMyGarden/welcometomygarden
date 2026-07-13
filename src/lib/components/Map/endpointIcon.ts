/**
 * Canvas-rendered icons for the route start/end badges drawn by FileTrails.svelte.
 *
 * Mapbox circle layers can only draw a single uniform fill, so the split red/green
 * "merged" badge is baked into a small image here and registered with the map, instead
 * of being drawn as (impossible) two half-circles.
 */
import type { Map } from 'mapbox-gl';
import type { RouteEndpoint } from '$lib/util/map/routeStyle';

/** Registered map-image ids for the three badge variants. */
export const ENDPOINT_ICONS = {
  start: 'trail-endpoint-start',
  end: 'trail-endpoint-end',
  pause: 'trail-endpoint-pause'
} as const;

// Badge geometry. Deliberately larger than the km circles so the start/end stand out.
const ENDPOINT_DIAMETER = 26;
const ENDPOINT_BORDER = 2;
// Icons are drawn at 2x and downscaled by Mapbox so they stay crisp.
const ENDPOINT_PIXEL_RATIO = 2;
const BADGE_GREEN = 'rgba(27, 120, 55, 0.92)';
const BADGE_RED = 'rgba(216, 67, 33, 0.92)';

/**
 * Draws a start/end/pause badge and returns it as ImageData: a coloured disc inside a
 * white ring. `start`/`end` are solid green/red; a merged `pause` badge is split
 * vertically — red on the left half, green on the right.
 */
const endpointIcon = (type: RouteEndpoint['type']): ImageData | null => {
  const size = ENDPOINT_DIAMETER * ENDPOINT_PIXEL_RATIO;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const r = size / 2;
  const inner = r - ENDPOINT_BORDER * ENDPOINT_PIXEL_RATIO;
  const TAU = Math.PI * 2;

  // White ring: a full white disc, with the coloured fill inset on top of it.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r, r, r, 0, TAU);
  ctx.fill();

  // Coloured fill, clipped to the inner circle.
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, inner, 0, TAU);
  ctx.clip();
  if (type === 'pause') {
    ctx.fillStyle = BADGE_RED;
    ctx.fillRect(0, 0, r, size);
    ctx.fillStyle = BADGE_GREEN;
    ctx.fillRect(r, 0, size - r, size);
  } else {
    ctx.fillStyle = type === 'start' ? BADGE_GREEN : BADGE_RED;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();

  return ctx.getImageData(0, 0, size, size);
};

/** Registers the (zoom-independent) badge icons on the map once. */
export const ensureEndpointIcons = (map: Map) => {
  (['start', 'end', 'pause'] as const).forEach((type) => {
    const id = ENDPOINT_ICONS[type];
    if (map.hasImage(id)) return;
    const image = endpointIcon(type);
    if (image) map.addImage(id, image, { pixelRatio: ENDPOINT_PIXEL_RATIO });
  });
};
