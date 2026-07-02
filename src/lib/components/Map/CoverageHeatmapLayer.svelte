<script module lang="ts">
  import type { ExpressionSpecification } from 'mapbox-gl';

  /**
   * Distance (km) around a single garden that counts as fully "covered". Within
   * this radius the overlay is solid green.
   */
  export const COVERAGE_RADIUS_KM = 15;

  /**
   * Distance (km) at which coverage has fully decayed to "no coverage" (red) in
   * the default modes. Between {@link COVERAGE_RADIUS_KM} and this distance the
   * overlay fades from green through yellow to red.
   */
  export const GRADIENT_END_KM = 25;

  /** Midpoint distance (km) of the gradient — the yellow stop. */
  export const MID_KM = (COVERAGE_RADIUS_KM + GRADIENT_END_KM) / 2;

  /**
   * Distance (km) at which coverage fully fades to transparent in the
   * "red → transparent" mode. The fade stretches over 15 km (15 → 30 km) rather
   * than the 10 km of the default gradient.
   */
  export const FADE_END_KM = 30;

  /**
   * Overlay colours (RGB triplets, without alpha) shared with the page legend so
   * the two always stay in sync.
   */
  export const COVERAGE_COLORS = {
    /** Well covered — within COVERAGE_RADIUS_KM of a garden. */
    covered: '46, 150, 80',
    /** Halfway through the gradient. */
    mid: '240, 200, 50',
    /** No garden nearby. */
    gap: '214, 40, 40'
  };

  /** Darker variants used for the isodistance border lines (and legend markers). */
  export const BORDER_COLORS = {
    covered: 'rgb(20, 100, 50)',
    mid: 'rgb(170, 130, 20)',
    gap: 'rgb(150, 25, 25)'
  };

  /** Translucency of the overlay so the underlying map stays legible. */
  const OVERLAY_ALPHA = 0.5;

  const rgba = (rgb: string) => `rgba(${rgb}, ${OVERLAY_ALPHA})`;
  const TRANSPARENT = 'rgba(0, 0, 0, 0)';

  /**
   * The Gaussian coefficient baked into Mapbox's heatmap kernel
   * (see mapbox-gl heatmap.fragment.glsl: `val = weight * intensity * GAUSS_COEF * exp(-4.5 * r²)`).
   */
  const GAUSS_COEF = 0.3989422804014327;

  /**
   * Mapbox samples the heatmap colour ramp with the raw accumulated density over
   * the domain [0, 1]. By setting the intensity to 1 / GAUSS_COEF, a single
   * garden's centre density normalizes to exactly 1.0, so the kernel maps
   * directly onto the ramp and a lone garden reaches its "near" colour.
   */
  const HEATMAP_INTENSITY = 1 / GAUSS_COEF;

  /**
   * The density that Mapbox's heatmap kernel produces for a single garden at a
   * given ground distance, when the heatmap radius represents `radiusKm` and the
   * centre density is normalized to 1: density(d) = exp(-4.5 * (d / radiusKm)²).
   */
  const densityAtKm = (km: number, radiusKm: number) => Math.exp(-4.5 * Math.pow(km / radiusKm, 2));

  /**
   * Reference latitude (degrees) used to convert a coverage radius from
   * kilometers to screen pixels. Mapbox's `heatmap-radius` is in pixels, and the
   * meters-per-pixel of a Web Mercator projection depends on the latitude. We
   * pick a latitude central to WTMG's core region (Western Europe).
   */
  const REFERENCE_LATITUDE = 50;

  /**
   * Ground resolution (meters per screen pixel) at the equator, zoom 0.
   * Mapbox GL JS renders with 512 px tiles, so at zoom z the world is 512 · 2^z
   * screen pixels wide. Hence: earthCircumference / (512 · 2^z) = 78271.52 / 2^z.
   * (Using the 256-tile constant, 156543, would make every radius half the
   * intended size and compress the whole gradient by 2×.)
   */
  const METERS_PER_PIXEL_EQUATOR_Z0 = 40075016.686 / 512;

  /** On-screen pixel radius representing `radiusKm` at a given zoom. */
  const radiusPxAtZoom = (zoom: number, radiusKm: number) => {
    const metersPerPixel =
      (METERS_PER_PIXEL_EQUATOR_Z0 * Math.cos((REFERENCE_LATITUDE * Math.PI) / 180)) /
      Math.pow(2, zoom);
    return (radiusKm * 1000) / metersPerPixel;
  };

  /**
   * The `heatmap-radius` expression representing `radiusKm` across zoom levels.
   * The pixel radius mapping to a fixed real-world distance doubles per zoom, so
   * an exponential (base 2) interpolation between two computed anchor stops
   * reproduces the curve exactly. Anchoring the low stop at zoom 0 (rather than
   * clamping at a higher zoom) keeps sparse regions realistically red/empty when
   * zoomed out, instead of a fixed pixel radius ballooning into hundreds of km of
   * false coverage.
   */
  const radiusExpr = (radiusKm: number): ExpressionSpecification =>
    [
      'interpolate',
      ['exponential', 2],
      ['zoom'],
      0,
      radiusPxAtZoom(0, radiusKm),
      16,
      radiusPxAtZoom(16, radiusKm)
    ] as ExpressionSpecification;

  /**
   * Heatmap paint (colour ramp + radius) for a given display mode. Density stops
   * are strictly ascending (further away = lower density).
   */
  const heatmapConfigForMode = (mode: CoverageMode) => {
    if (mode === 'red-transparent') {
      // Solid green to 15 km, then fade green → transparent out to 30 km.
      const R = FADE_END_KM;
      return {
        radiusKm: R,
        color: [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          TRANSPARENT,
          densityAtKm(R, R),
          TRANSPARENT,
          densityAtKm(COVERAGE_RADIUS_KM, R),
          rgba(COVERAGE_COLORS.covered),
          1,
          rgba(COVERAGE_COLORS.covered)
        ] as ExpressionSpecification
      };
    }
    if (mode === 'green-transparent') {
      // Covered area transparent, fading through yellow to red at the gaps.
      const R = GRADIENT_END_KM;
      return {
        radiusKm: R,
        color: [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          rgba(COVERAGE_COLORS.gap),
          densityAtKm(R, R),
          rgba(COVERAGE_COLORS.gap),
          densityAtKm(MID_KM, R),
          rgba(COVERAGE_COLORS.mid),
          densityAtKm(COVERAGE_RADIUS_KM, R),
          TRANSPARENT,
          1,
          TRANSPARENT
        ] as ExpressionSpecification
      };
    }
    // 'status-quo' and 'isodistance' share the green → yellow → red overlay.
    const R = GRADIENT_END_KM;
    return {
      radiusKm: R,
      color: [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        rgba(COVERAGE_COLORS.gap),
        densityAtKm(R, R),
        rgba(COVERAGE_COLORS.gap),
        densityAtKm(MID_KM, R),
        rgba(COVERAGE_COLORS.mid),
        densityAtKm(COVERAGE_RADIUS_KM, R),
        rgba(COVERAGE_COLORS.covered),
        1,
        rgba(COVERAGE_COLORS.covered)
      ] as ExpressionSpecification
    };
  };
</script>

<script lang="ts">
  import type { Garden } from '$lib/types/Garden';
  import type { ContextType } from './Map.svelte';
  import type GeoJSON from 'geojson';
  import type { CoverageMode } from '$lib/stores/coverageTweaks';

  import { getContext, onDestroy, onMount } from 'svelte';
  import key from './mapbox-context.js';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';
  import { computeIsodistanceUnion } from '$lib/util/map/coverageContours';

  interface Props {
    gardens: Garden[];
    mode?: CoverageMode;
  }

  let { gardens, mode = 'status-quo' }: Props = $props();

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const sourceId = 'coverage-gardens';
  const heatmapLayerId = 'coverage-heatmap';

  // Isodistance rings, outermost first so the innermost (15 km) is drawn on top.
  const ISO_RINGS = [
    { key: 'gap', km: GRADIENT_END_KM, color: BORDER_COLORS.gap },
    { key: 'mid', km: MID_KM, color: BORDER_COLORS.mid },
    { key: 'covered', km: COVERAGE_RADIUS_KM, color: BORDER_COLORS.covered }
  ] as const;

  const isoSourceId = (ringKey: string) => `coverage-iso-${ringKey}`;
  const isoLayerId = (ringKey: string) => `coverage-iso-${ringKey}-line`;

  let mapReady = $state(false);

  // Cache the computed isodistance unions, keyed by the gardens array we computed
  // them for, so switching modes back and forth doesn't recompute.
  let isoComputedFor: Garden[] | null = null;

  const buildFeatureCollection = (): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: gardens
      .filter((garden) => !!garden.location)
      .map((garden) => ({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [garden.location.longitude, garden.location.latitude]
        }
      }))
  });

  const applyMode = () => {
    const { color, radiusKm } = heatmapConfigForMode(mode);
    map.setPaintProperty(heatmapLayerId, 'heatmap-color', color);
    map.setPaintProperty(heatmapLayerId, 'heatmap-radius', radiusExpr(radiusKm));
  };

  const removeIsoLayers = () => {
    for (const ring of ISO_RINGS) {
      if (map.getLayer(isoLayerId(ring.key))) map.removeLayer(isoLayerId(ring.key));
      if (map.getSource(isoSourceId(ring.key))) map.removeSource(isoSourceId(ring.key));
    }
  };

  const addIsoLayers = () => {
    // (Re)compute the unions if we haven't for this set of gardens yet.
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    for (const ring of ISO_RINGS) {
      const union = computeIsodistanceUnion(gardens, ring.km);
      const data = union ?? empty;
      map.addSource(isoSourceId(ring.key), { type: 'geojson', data });
      map.addLayer({
        id: isoLayerId(ring.key),
        type: 'line',
        source: isoSourceId(ring.key),
        paint: {
          'line-color': ring.color,
          'line-width': 2,
          'line-opacity': 0.9
        }
      });
    }
    isoComputedFor = gardens;
  };

  const syncIsoLayers = () => {
    const shouldShow = mode === 'isodistance';
    const present = map.getLayer(isoLayerId(ISO_RINGS[0].key)) != null;
    if (shouldShow && (!present || isoComputedFor !== gardens)) {
      // Rebuild from scratch when first shown or when the gardens changed.
      removeIsoLayers();
      addIsoLayers();
    } else if (!shouldShow && present) {
      removeIsoLayers();
    }
  };

  const initializeLayer = () => {
    try {
      map.addSource(sourceId, {
        type: 'geojson',
        data: buildFeatureCollection()
      });

      // An "inverse" heatmap of garden coverage. Because a heatmap paints its whole
      // extent by density, areas with no nearby garden (density 0) get the "gap"
      // colour, and the colour shifts as we approach a garden. The exact ramp and
      // radius depend on the active display mode (see heatmapConfigForMode).
      const { color, radiusKm } = heatmapConfigForMode(mode);
      map.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: sourceId,
        paint: {
          'heatmap-weight': 1,
          // Normalizes a single garden's centre density to 1.0 (see HEATMAP_INTENSITY).
          'heatmap-intensity': HEATMAP_INTENSITY,
          'heatmap-color': color,
          'heatmap-radius': radiusExpr(radiusKm),
          'heatmap-opacity': 1
        }
      });
    } catch (err) {
      logger.error(err);
      Sentry.captureException(err, {
        extra: { context: 'Initializing the coverage heatmap layer' }
      });
    } finally {
      mapReady = true;
    }
  };

  // Keep the garden source data in sync.
  $effect(() => {
    if (mapReady) {
      map.getSource(sourceId)?.setData(buildFeatureCollection());
    }
  });

  // React to display-mode (and gardens) changes. Both `applyMode` and
  // `syncIsoLayers` read the reactive `mode`/`gardens` props, so this effect
  // re-runs whenever they change.
  $effect(() => {
    if (!mapReady) return;
    try {
      applyMode();
      syncIsoLayers();
    } catch (err) {
      logger.error(err);
      Sentry.captureException(err, {
        extra: { context: 'Updating the coverage heatmap mode' }
      });
    }
  });

  onMount(() => {
    initializeLayer();
  });

  onDestroy(() => {
    // The map instance persists across client-side navigations within the layout,
    // but this component is destroyed when leaving the page; clean up after ourselves.
    removeIsoLayers();
    if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  });
</script>
