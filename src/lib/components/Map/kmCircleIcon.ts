/**
 * Canvas-rendered white circle background for the km markers drawn by FileTrails.svelte.
 *
 * The km number used to sit on a Mapbox `circle` layer, but circle layers can't take part in
 * the native symbol fade (the map's `fadeDuration`) that the number's symbol layer uses when
 * it reveals at a zoom threshold — so the circle popped in while the number faded. Baking the
 * circle into an image lets it live on the *same* symbol layer as the number (as its `icon`),
 * so Mapbox fades the circle and number in/out together, natively.
 *
 * One image is registered per route colour (the ring matches the route line).
 */
import type { Map } from 'mapbox-gl';

// Matches the old circle layer: a white fill of radius 9 with a 1.5px coloured ring around it.
const KM_CIRCLE_RADIUS = 9;
const KM_CIRCLE_STROKE = 1.5;
// Drawn at 2x and downscaled by Mapbox so it stays crisp.
const KM_CIRCLE_PIXEL_RATIO = 2;

/** Registered map-image id for a km circle of the given colour. */
export const kmCircleIconId = (color: string) => `km-circle-${color}`;

const drawKmCircle = (color: string): ImageData | null => {
  const scale = KM_CIRCLE_PIXEL_RATIO;
  const outer = KM_CIRCLE_RADIUS + KM_CIRCLE_STROKE; // the ring sits outside the white fill
  // +1px transparent margin so the ring's antialiasing isn't clipped at the canvas edge.
  const size = Math.ceil((outer + 1) * 2 * scale);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const c = size / 2; // circle centre (both axes)
  const TAU = Math.PI * 2;

  // Coloured ring: a full coloured disc at the outer radius...
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c, c, outer * scale, 0, TAU);
  ctx.fill();

  // ...with the white fill drawn on top, leaving only the ring showing.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(c, c, KM_CIRCLE_RADIUS * scale, 0, TAU);
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
};

/**
 * Registers the km circle image for `color` on the map once (idempotent) and returns its
 * image id, ready to be used as an `icon-image`.
 */
export const ensureKmCircleIcon = (map: Map, color: string): string => {
  const id = kmCircleIconId(color);
  if (map.hasImage(id)) return id;
  const image = drawKmCircle(color);
  if (image) map.addImage(id, image, { pixelRatio: KM_CIRCLE_PIXEL_RATIO });
  return id;
};
