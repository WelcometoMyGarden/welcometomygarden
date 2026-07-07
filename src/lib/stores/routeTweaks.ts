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
  /** Show start & end markers at the route extremities. */
  showStartEndMarkers: boolean;
  /** Draw the route lines semi-transparently so the underlying road stays visible. */
  transparentRoutes: boolean;
  /**
   * Only apply the transparent route styling once the map is zoomed in far enough to
   * look at the route in detail; at lower zoom levels the routes stay fully opaque.
   */
  transparentRoutesHighZoomOnly: boolean;
  /**
   * Draw the km marker background fully white instead of slightly transparent, so the
   * underlying map never shows through the marker.
   */
  whiteKmBackground: boolean;
  /**
   * Shrink the km marker label slightly when it has more than 2 digits (> 99), so the
   * number still fits inside the marker.
   */
  shrinkLargeKmLabels: boolean;
  /**
   * Draw the km markers as ovals (stretched horizontally to fit their number) rather
   * than fixed-size circles.
   */
  ovalKmMarkers: boolean;
  /** Show the (GPX) file name as a label repeated along each route. */
  showRouteNames: boolean;
  /**
   * Also place the route-name labels at (much) lower zoom levels, by making label
   * placement effectively geometry-independent (no bend-angle limit, tighter spacing,
   * smaller low-zoom text). This makes every file's name show up together at a low zoom,
   * instead of each file popping in at a different, higher zoom as the route lays out.
   */
  showRouteNamesLowZoom: boolean;
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
  showStartEndMarkers: true,
  transparentRoutes: true,
  transparentRoutesHighZoomOnly: true,
  whiteKmBackground: true,
  shrinkLargeKmLabels: true,
  ovalKmMarkers: false,
  showRouteNames: true,
  showRouteNamesLowZoom: false,
  zoomIntervalConfig: DEFAULT_ZOOM_INTERVAL_CONFIG,
  routeLayerMode: 'kmOnTopOverlap',
  endpointMode: 'dots'
});

/** Live mirror of the current map zoom level, for display in the tweaks panel. */
export const currentMapZoom = writable<number | null>(null);

/**
 * The km marker interval + opacity currently in effect for the live zoom level.
 * `null` means markers are fully hidden.
 */
export const effectiveKm = writable<{ interval: number; opacity: number } | null>(null);
