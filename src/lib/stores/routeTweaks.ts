/**
 * Temporary prototype store for route-file display "tweaks".
 *
 * Controls a one-off overlay on the map that lets us experiment with how uploaded
 * routes are displayed (colours, kilometre markers, start/end markers).
 *
 * NOTE: this is intentionally a self-contained, removable prototype.
 */
import { writable } from 'svelte/store';

export type RouteTweaks = {
  /** Whether the tweaks overlay panel itself is visible. */
  panelOpen: boolean;
  /** Use the alternating colour palette instead of a single purple. */
  useMultipleColors: boolean;
  /** Show kilometre markers along each route. */
  showKmMarkers: boolean;
  /** Interval (in km) between kilometre markers. */
  kmInterval: number;
  /** Show start & end markers at the route extremities. */
  showStartEndMarkers: boolean;
};

export const routeTweaks = writable<RouteTweaks>({
  panelOpen: true,
  useMultipleColors: true,
  showKmMarkers: true,
  kmInterval: 1,
  showStartEndMarkers: true
});
