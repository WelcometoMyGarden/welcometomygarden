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
 */
export type RouteLayerMode = 'default' | 'kmOnTop' | 'raiseOnHover';

export type RouteTweaks = {
  /** Whether the tweaks overlay panel itself is visible. */
  panelOpen: boolean;
  /** Use the alternating colour palette instead of a single purple. */
  useMultipleColors: boolean;
  /** Show kilometre markers along each route. */
  showKmMarkers: boolean;
  /** Show start & end markers at the route extremities. */
  showStartEndMarkers: boolean;
  /**
   * Zoom→interval rules (one per line, `<min>-<max>,<intervalKm>`) driving the km
   * marker spacing dynamically based on the current map zoom level.
   */
  zoomIntervalConfig: string;
  /** How overlapping routes & their km markers are stacked. */
  routeLayerMode: RouteLayerMode;
};

export const routeTweaks = writable<RouteTweaks>({
  panelOpen: true,
  useMultipleColors: true,
  showKmMarkers: true,
  showStartEndMarkers: true,
  zoomIntervalConfig: DEFAULT_ZOOM_INTERVAL_CONFIG,
  routeLayerMode: 'default'
});

/** Live mirror of the current map zoom level, for display in the tweaks panel. */
export const currentMapZoom = writable<number | null>(null);

/**
 * The km marker interval + opacity currently in effect for the live zoom level.
 * `null` means markers are fully hidden.
 */
export const effectiveKm = writable<{ interval: number; opacity: number } | null>(null);
