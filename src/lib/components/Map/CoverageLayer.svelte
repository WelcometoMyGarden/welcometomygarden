<script module lang="ts">
  /** Distance (km) around a single garden that counts as "covered" (green). */
  export const COVERAGE_RADIUS_KM = 15;

  /** Overlay colours (RGB triplets, without alpha) shared with the page legend. */
  export const COVERAGE_COLORS = {
    covered: '46, 150, 80', // green
    gap: '214, 40, 40' // red
  };

  /** Default translucency of the overlay so the underlying map stays legible. */
  export const DEFAULT_OVERLAY_OPACITY = 0.5;

  /**
   * Where to insert the overlay in the style's layer stack, relative to the
   * basemap's own roads and labels:
   * - `top`: above everything, including labels.
   * - `above-roads`: above roads, but below "big" place labels (country/state/
   *   settlement names) so those stay legible.
   * - `above-roads-below-borders`: same placement as `above-roads`, plus a
   *   custom-redrawn country border (crisp dark line + thin light halo) always
   *   on top. The basemap's own border rendering fades in/out with zoom and
   *   gets buried under the fill otherwise, so we draw our own instead of
   *   trying to slot the fill underneath it.
   * - `below-roads`: below roads and labels (mirrors a plain basemap fill).
   */
  export type StackOrder = 'top' | 'above-roads' | 'above-roads-below-borders' | 'below-roads';

  /**
   * Symbol layer id prefixes that identify place-name labels in the
   * `mapbox/streets-v8` style used here (as opposed to road, POI, or transit
   * labels) — e.g. `place-city-lg-n`, `place-town`, `country-label-md`,
   * `state-label-sm`. Note: newer Mapbox styles (v11+) use `settlement-*`
   * instead of `place-*` — adjust these if the style is ever upgraded.
   */
  const BIG_PLACE_LABEL_PREFIXES = ['place-', 'country-label', 'state-label'];

  /**
   * The vector source/layer backing the basemap's own country border lines
   * (see `admin-2-boundaries` in the `mapbox/streets-v8` style). Reused for our
   * custom border redraw so it doesn't need any extra data.
   */
  const ADMIN_SOURCE = 'composite';
  const ADMIN_SOURCE_LAYER = 'admin';
  const COUNTRY_LEVEL_FILTER = [
    ['==', 'admin_level', 2],
    ['==', 'maritime', 0]
  ];
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
    /** Overlay opacity, 0–1. */
    opacity?: number;
    stackOrder?: StackOrder;
  }
  let {
    showGap = true,
    opacity = DEFAULT_OVERLAY_OPACITY,
    stackOrder = 'below-roads'
  }: Props = $props();

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const ids = {
    coverageSrc: 'garden-coverage',
    coverageFill: 'garden-coverage-fill',
    gapSrc: 'garden-coverage-gap',
    gapFill: 'garden-coverage-gap-fill',
    borderHalo: 'garden-coverage-border-halo',
    borderMain: 'garden-coverage-border-main',
    borderDispute: 'garden-coverage-border-dispute'
  };

  const styleLayers = () => map.getStyle()?.layers ?? [];

  const firstLayerIdOfType = (type: string) => styleLayers().find((l) => l.type === type)?.id;

  const firstBigPlaceLabelLayerId = () =>
    styleLayers().find(
      (l) => l.type === 'symbol' && BIG_PLACE_LABEL_PREFIXES.some((p) => l.id.startsWith(p))
    )?.id;

  // Resolves the `beforeId` to pass to addLayer/moveLayer for the coverage fill.
  // `undefined` means "on top of everything".
  const resolveBeforeId = (order: StackOrder): string | undefined => {
    switch (order) {
      case 'top':
        return undefined;
      case 'above-roads':
      case 'above-roads-below-borders':
        // Fall back to any label if the style has no "big place" labels.
        return firstBigPlaceLabelLayerId() ?? firstLayerIdOfType('symbol');
      case 'below-roads':
        return firstLayerIdOfType('symbol');
    }
  };

  // Redraws country borders ourselves, always on top of the fill (and everything
  // else), with a crisp dark line + a thin light halo for legibility — regardless
  // of zoom level or what's underneath. Reuses the basemap's own admin vector
  // data, just with our own paint.
  const addCustomCountryBorders = () => {
    if (map.getLayer(ids.borderMain)) return; // already added
    if (!map.getSource(ADMIN_SOURCE)) return; // style has no admin boundary data to reuse

    const base = {
      type: 'line' as const,
      source: ADMIN_SOURCE,
      'source-layer': ADMIN_SOURCE_LAYER,
      layout: { 'line-join': 'round' as const, 'line-cap': 'round' as const }
    };
    const widthByZoom = (widths: [number, number, number, number]) =>
      ['interpolate', ['linear'], ['zoom'], 0, widths[0], 5, widths[1], 10, widths[2], 16, widths[3]];

    map.addLayer({
      ...base,
      id: ids.borderHalo,
      filter: ['all', ...COUNTRY_LEVEL_FILTER],
      paint: {
        'line-color': 'rgba(255, 255, 255, 0.9)',
        'line-width': widthByZoom([2, 3, 4, 5.5])
      }
    });

    map.addLayer({
      ...base,
      id: ids.borderMain,
      filter: ['all', ...COUNTRY_LEVEL_FILTER, ['==', 'disputed', 0]],
      paint: {
        'line-color': '#262626',
        'line-width': widthByZoom([0.6, 1, 2, 3])
      }
    });

    // Disputed borders keep a dashed style, same convention as the basemap.
    map.addLayer({
      ...base,
      id: ids.borderDispute,
      filter: ['all', ...COUNTRY_LEVEL_FILTER, ['==', 'disputed', 1]],
      paint: {
        'line-color': '#262626',
        'line-dasharray': [2, 1.5],
        'line-width': widthByZoom([0.6, 1, 2, 3])
      }
    });
  };

  const removeCustomCountryBorders = () => {
    for (const id of [ids.borderHalo, ids.borderMain, ids.borderDispute]) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
  };

  let mapReady = $state(false);

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

      const beforeId = resolveBeforeId(stackOrder);

      if (showGap && gap) {
        map.addSource(ids.gapSrc, { type: 'geojson', data: gap });
        map.addLayer(
          {
            id: ids.gapFill,
            type: 'fill',
            source: ids.gapSrc,
            paint: {
              'fill-color': `rgb(${COVERAGE_COLORS.gap})`,
              'fill-opacity': opacity,
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
            'fill-opacity': opacity,
            'fill-antialias': true
          }
        },
        beforeId
      );

      if (stackOrder === 'above-roads-below-borders') addCustomCountryBorders();

      mapReady = true;
    } catch (err) {
      logger.error(err);
      Sentry.captureException(err, { extra: { context: 'Initializing the coverage layer' } });
    }
  };

  onMount(initialize);

  // Adjust opacity live (e.g. from a tweak panel) without refetching/re-adding layers.
  $effect(() => {
    if (!mapReady) return;
    for (const id of [ids.coverageFill, ids.gapFill]) {
      if (map.getLayer(id)) map.setPaintProperty(id, 'fill-opacity', opacity);
    }
  });

  // Adjust stacking live by moving the existing layers, cheaper than re-adding them.
  $effect(() => {
    if (!mapReady) return;
    try {
      const beforeId = resolveBeforeId(stackOrder);
      // Re-insert in the same relative order as initialize() (gap below coverage).
      if (map.getLayer(ids.gapFill)) map.moveLayer(ids.gapFill, beforeId);
      if (map.getLayer(ids.coverageFill)) map.moveLayer(ids.coverageFill, beforeId);

      if (stackOrder === 'above-roads-below-borders') {
        addCustomCountryBorders();
      } else {
        removeCustomCountryBorders();
      }
    } catch (err) {
      logger.error(err);
      Sentry.captureException(err, { extra: { context: 'Updating the coverage layer stacking' } });
    }
  });

  onDestroy(() => {
    for (const id of [ids.coverageFill, ids.gapFill, ids.borderHalo, ids.borderMain, ids.borderDispute])
      if (map.getLayer(id)) map.removeLayer(id);
    for (const id of [ids.coverageSrc, ids.gapSrc]) if (map.getSource(id)) map.removeSource(id);
  });
</script>
