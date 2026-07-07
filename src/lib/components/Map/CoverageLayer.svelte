<script module lang="ts">
  /** Distance (km) around a single garden that counts as "covered" (green). */
  export const COVERAGE_RADIUS_KM = 15;

  /** Overlay colours (RGB triplets, without alpha) shared with the page legend. */
  export const COVERAGE_COLORS = {
    covered: '46, 150, 80', // green
    gap: '214, 40, 40' // red
  };

  /** Translucency of the overlay so the underlying map stays legible. */
  export const OVERLAY_OPACITY = 0.5;

  /**
   * The `mapbox/streets-v8` style's landcover fill colour (`grass`/`wood`
   * layers), i.e. the light green the map is mostly covered in at the zoom
   * levels this page is viewed at.
   */
  const BASE_MAP_LANDCOVER_RGB: [number, number, number] = [221, 236, 177]; // #ddecb1

  const parseRgb = (rgb: string): [number, number, number] =>
    rgb.split(',').map(Number) as [number, number, number];

  // Approximates the overlay's actual on-map look — the given colour at
  // OVERLAY_OPACITY, blended over the basemap's landcover green — as a flat
  // "r, g, b" string usable in a solid (opaque) legend swatch.
  const blendOverLandcover = (rgb: string): string => {
    const [br, bg, bb] = BASE_MAP_LANDCOVER_RGB;
    const [r, g, b] = parseRgb(rgb);
    const mix = (base: number, val: number) => Math.round(base * (1 - OVERLAY_OPACITY) + val * OVERLAY_OPACITY);
    return `${mix(br, r)}, ${mix(bg, g)}, ${mix(bb, b)}`;
  };

  /** Flat colours for the legend swatches, approximating the semi-transparent
   * overlay's actual appearance on top of the (mostly light green) basemap. */
  export const LEGEND_COLORS = {
    covered: blendOverLandcover(COVERAGE_COLORS.covered),
    gap: blendOverLandcover(COVERAGE_COLORS.gap)
  };

  /**
   * Symbol layer id prefixes that identify place-name labels in the
   * `mapbox/streets-v8` style used here (as opposed to road, POI, or transit
   * labels) — e.g. `place-city-lg-n`, `place-town`, `country-label-md`,
   * `state-label-sm`. Note: newer Mapbox styles (v11+) use `settlement-*`
   * instead of `place-*` — adjust these if the style is ever upgraded.
   */
  const BIG_PLACE_LABEL_PREFIXES = ['place-', 'country-label', 'state-label'];
</script>

<script lang="ts">
  import type { ContextType } from './Map.svelte';
  import type GeoJSON from 'geojson';

  import { getContext, onDestroy, onMount } from 'svelte';
  import key from './mapbox-context.js';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';
  import { COVERAGE_GEOJSON_URL, COVERAGE_COMPLEMENT_GEOJSON_URL } from '$lib/constants';

  interface Props {
    /** Also draw the red "not covered" overlay. If false, only the green overlay is drawn. */
    showGap?: boolean;
  }
  let { showGap = true }: Props = $props();

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const ids = {
    coverageSrc: 'garden-coverage',
    coverageFill: 'garden-coverage-fill',
    gapSrc: 'garden-coverage-gap',
    gapFill: 'garden-coverage-gap-fill'
  };

  // Draws the fills above roads, but below "big" place labels so those stay
  // legible on top of the overlay.
  const beforeLayerId = () => {
    const layers = map.getStyle()?.layers ?? [];
    return layers.find(
      (l) => l.type === 'symbol' && BIG_PLACE_LABEL_PREFIXES.some((p) => l.id.startsWith(p))
    )?.id;
  };

  const initialize = async () => {
    try {
      const [coverage, gap] = await Promise.all([
        fetch(COVERAGE_GEOJSON_URL).then((r) => r.json() as Promise<GeoJSON.FeatureCollection>),
        showGap
          ? fetch(COVERAGE_COMPLEMENT_GEOJSON_URL).then(
              (r) => r.json() as Promise<GeoJSON.FeatureCollection>
            )
          : Promise.resolve(null)
      ]);

      const beforeId = beforeLayerId();

      if (showGap && gap) {
        map.addSource(ids.gapSrc, { type: 'geojson', data: gap });
        map.addLayer(
          {
            id: ids.gapFill,
            type: 'fill',
            source: ids.gapSrc,
            paint: {
              'fill-color': `rgb(${COVERAGE_COLORS.gap})`,
              'fill-opacity': OVERLAY_OPACITY,
              'fill-antialias': true
            }
          },
          beforeId
        );
      }

      map.addSource(ids.coverageSrc, { type: 'geojson', data: coverage });
      map.addLayer(
        {
          id: ids.coverageFill,
          type: 'fill',
          source: ids.coverageSrc,
          paint: {
            'fill-color': `rgb(${COVERAGE_COLORS.covered})`,
            'fill-opacity': OVERLAY_OPACITY,
            'fill-antialias': true
          }
        },
        beforeId
      );
    } catch (err) {
      logger.error(err);
      Sentry.captureException(err, { extra: { context: 'Initializing the coverage layer' } });
    }
  };

  onMount(initialize);

  onDestroy(() => {
    for (const id of [ids.coverageFill, ids.gapFill]) if (map.getLayer(id)) map.removeLayer(id);
    for (const id of [ids.coverageSrc, ids.gapSrc]) if (map.getSource(id)) map.removeSource(id);
  });
</script>
