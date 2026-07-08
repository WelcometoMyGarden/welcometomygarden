/**
 * Temporary prototype store for route-file display "tweaks".
 *
 * Most prototype options have been validated and folded into the default behaviour of
 * `FileTrails.svelte`; what remains here is the one still-experimental tweak.
 *
 * NOTE: this is intentionally a self-contained, removable prototype.
 */
import { writable } from 'svelte/store';

/**
 * Where the route-name labels are drawn:
 * - `onRoute`: a single centred label per non-overlapping stretch, on the route line
 * - `besideRoute`: the name repeated alongside the route (following its curvature) with
 *   some spacing, a slightly larger font and a slightly bigger white outline
 */
export type RouteNamePlacement = 'onRoute' | 'besideRoute';

export type RouteTweaks = {
  /** Whether the tweaks overlay panel itself is visible. */
  panelOpen: boolean;
  /** Where the route-name labels are drawn. */
  routeNamePlacement: RouteNamePlacement;
};

export const routeTweaks = writable<RouteTweaks>({
  panelOpen: false,
  routeNamePlacement: 'onRoute'
});
