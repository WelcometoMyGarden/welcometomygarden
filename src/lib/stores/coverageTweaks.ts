/**
 * Prototype store for the /coveragegaps map "tweaks" overlay.
 *
 * Lets us experiment with how garden coverage is visualized. Mutually exclusive
 * display modes, plus whether the tweaks panel itself is open.
 *
 * NOTE: intentionally a self-contained, removable prototype (mirrors the pattern
 * of the route tweaks overlay on /explore).
 */
import { writable } from 'svelte/store';

export type CoverageMode =
  /** Green (covered) → yellow → red (gap). The default overlay. */
  | 'status-quo'
  /** Covered areas fade to transparent instead of green; gaps stay red. */
  | 'green-transparent'
  /** Gaps fade to transparent instead of red; covered stays green (fade over 15–30 km). */
  | 'red-transparent'
  /** Status-quo overlay plus 15/20/25 km isodistance border lines. */
  | 'isodistance';

export type CoverageTweaks = {
  /** Whether the tweaks overlay panel is visible. Closed by default. */
  panelOpen: boolean;
  /** The active visualization mode. */
  mode: CoverageMode;
};

export const coverageTweaks = writable<CoverageTweaks>({
  panelOpen: false,
  mode: 'status-quo'
});
