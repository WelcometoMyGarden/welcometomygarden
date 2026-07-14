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
const ENDPOINT_DIAMETER = 20;
const ENDPOINT_BORDER = 2;
// Icons are drawn at 2x and downscaled by Mapbox so they stay crisp.
const ENDPOINT_PIXEL_RATIO = 2;
const BADGE_GREEN = 'rgba(27, 120, 55, 0.92)';
const BADGE_RED = 'rgba(216, 67, 33, 0.92)';

// Drop shadow, equivalent to CSS `box-shadow: rgba(0,0,0,0.4) 0 1px 4px`.
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.4)';
const SHADOW_BLUR = 4;
const SHADOW_OFFSET_Y = 1;
// Transparent margin around the disc so the blurred shadow isn't clipped at the edges.
const SHADOW_PAD = SHADOW_BLUR + SHADOW_OFFSET_Y + 1;

/**
 * Draws a start/end/pause badge and returns it as ImageData: a coloured disc inside a
 * white ring, with a soft drop shadow. `start`/`end` are solid green/red; a merged
 * `pause` badge is split vertically — red on the left half, green on the right.
 */
const endpointIcon = (type: RouteEndpoint['type']): ImageData | null => {
  const scale = ENDPOINT_PIXEL_RATIO;
  // Padded canvas: the disc plus room on every side for the shadow blur/offset.
  const size = (ENDPOINT_DIAMETER + SHADOW_PAD * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const c = size / 2; // disc centre (both axes)
  const r = (ENDPOINT_DIAMETER / 2) * scale; // outer (white ring) radius
  const inner = r - ENDPOINT_BORDER * scale;
  const TAU = Math.PI * 2;

  // White ring: a full white disc, drawn with the drop shadow.
  ctx.save();
  ctx.shadowColor = SHADOW_COLOR;
  ctx.shadowBlur = SHADOW_BLUR * scale;
  ctx.shadowOffsetY = SHADOW_OFFSET_Y * scale;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(c, c, r, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Coloured fill, clipped to the inner circle (no shadow).
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, inner, 0, TAU);
  ctx.clip();
  if (type === 'pause') {
    ctx.fillStyle = BADGE_RED;
    ctx.fillRect(0, 0, c, size); // left half of the disc
    ctx.fillStyle = BADGE_GREEN;
    ctx.fillRect(c, 0, size - c, size); // right half
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
