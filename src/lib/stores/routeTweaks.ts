/**
 * Temporary prototype store for route-file display "tweaks".
 *
 * Controls a one-off overlay on the map that lets us experiment with how uploaded
 * routes are displayed (colours, kilometre markers, start/end markers).
 *
 * NOTE: this is intentionally a self-contained, removable prototype.
 */
import { writable } from 'svelte/store';
import { DEFAULT_ZOOM_INTERVAL_CONFIG } from '$lib/util/map/routeStyle';

/**
 * How overlapping routes & their km markers are stacked:
 * - `default`: per-route interleaved (a later route can cover earlier markers)
 * - `kmOnTop`: all km markers drawn above all route lines
 * - `raiseOnHover`: hovering/tapping a route brings it and its markers to the top
 * - `kmOnTopHover`: km markers on top, plus the hover/tap raise behaviour
 * - `kmOnTopOverlap`: km markers on top, plus shared route segments drawn as a single
 *   line alternating the two routes' colours
 */
export type RouteLayerMode =
  | 'default'
  | 'kmOnTop'
  | 'raiseOnHover'
  | 'kmOnTopHover'
  | 'kmOnTopOverlap';

/**
 * How start/end/pause markers are drawn:
 * - `icons`: play (start), stop square (end), pause bars (merged) — the status quo
 * - `flags`: plain green circle (start) and a checkerboard finish badge (end AND
 *   merged), both with a thin white border
 * - `dots`: green circle (start), red circle (end) and a vertically split
 *   half-green/half-red circle (merged start+end), all with a thin white border
 */
export type EndpointMode = 'icons' | 'flags' | 'dots';

export type RouteTweaks = {
  /** Whether the tweaks overlay panel itself is visible. */
  panelOpen: boolean;
  /** Use the alternating colour palette instead of a single purple. */
  useMultipleColors: boolean;
  /** Show kilometre markers along each route. */
  showKmMarkers: boolean;
  /**
   * Fade the km markers in/out around their zoom thresholds. When off, they simply
   * appear/disappear at full opacity instead of gradually fading.
   */
  fadeKmMarkers: boolean;
  /** Show start & end markers at the route extremities. */
  showStartEndMarkers: boolean;
  /** Draw the route lines semi-transparently so the underlying road stays visible. */
  transparentRoutes: boolean;
  /** Show the (GPX) file name as a label repeated along each route. */
  showRouteNames: boolean;
  /**
   * Zoom→interval rules (one per line, `<min>-<max>,<intervalKm>`) driving the km
   * marker spacing dynamically based on the current map zoom level.
   */
  zoomIntervalConfig: string;
  /** How overlapping routes & their km markers are stacked. */
  routeLayerMode: RouteLayerMode;
  /** How start/end/pause markers are drawn. */
  endpointMode: EndpointMode;
};

export const routeTweaks = writable<RouteTweaks>({
  panelOpen: false,
  useMultipleColors: true,
  showKmMarkers: true,
  fadeKmMarkers: true,
  showStartEndMarkers: true,
  transparentRoutes: false,
  showRouteNames: false,
  zoomIntervalConfig: DEFAULT_ZOOM_INTERVAL_CONFIG,
  routeLayerMode: 'kmOnTopOverlap',
  endpointMode: 'flags'
});

/** Live mirror of the current map zoom level, for display in the tweaks panel. */
export const currentMapZoom = writable<number | null>(null);

/**
 * The km marker interval + opacity currently in effect for the live zoom level.
 * `null` means markers are fully hidden.
 */
export const effectiveKm = writable<{ interval: number; opacity: number } | null>(null);
