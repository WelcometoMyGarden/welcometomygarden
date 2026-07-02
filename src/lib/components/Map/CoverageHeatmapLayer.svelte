<script module lang="ts">
  /**
   * Distance (km) around a single garden that counts as fully "covered". Within
   * this radius the overlay is solid green.
   */
  export const COVERAGE_RADIUS_KM = 15;

  /**
   * Distance (km) at which coverage has fully decayed to "no coverage" (red).
   * Between {@link COVERAGE_RADIUS_KM} and this distance the overlay fades from
   * green through yellow to red.
   */
  export const GRADIENT_END_KM = 25;

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

  /** Translucency of the overlay so the underlying map stays legible. */
  const OVERLAY_ALPHA = 0.5;

  const rgba = (rgb: string) => `rgba(${rgb}, ${OVERLAY_ALPHA})`;

  /**
   * The Gaussian coefficient baked into Mapbox's heatmap kernel
   * (see mapbox-gl heatmap.fragment.glsl: `val = weight * intensity * GAUSS_COEF * exp(-4.5 * r²)`).
   */
  const GAUSS_COEF = 0.3989422804014327;

  /**
   * Mapbox samples the heatmap colour ramp with the raw accumulated density over
   * the domain [0, 1]. By setting the intensity to 1 / GAUSS_COEF, a single
   * garden's centre density normalizes to exactly 1.0, so the kernel maps
   * directly onto the ramp and a lone garden reaches the "green" end.
   */
  const HEATMAP_INTENSITY = 1 / GAUSS_COEF;

  /**
   * The density that Mapbox's heatmap kernel produces for a single garden at a
   * given ground distance, given the heatmap radius represents {@link GRADIENT_END_KM}
   * and the centre density is normalized to 1.
   *
   * density(d) = exp(-4.5 * (d / radius)²)
   */
  const densityAtKm = (km: number) => Math.exp(-4.5 * Math.pow(km / GRADIENT_END_KM, 2));

  /**
   * Reference latitude (degrees) used to convert the coverage radius from
   * kilometers to screen pixels. Mapbox's `heatmap-radius` is in pixels, and the
   * meters-per-pixel of a Web Mercator projection depends on the latitude. We
   * pick a latitude central to WTMG's core region (Western Europe).
   */
  const REFERENCE_LATITUDE = 50;

  /**
   * On-screen pixel radius representing {@link GRADIENT_END_KM} at a given zoom.
   *
   * meters-per-pixel = 156543.03392 * cos(lat) / 2^zoom
   */
  const radiusPxAtZoom = (zoom: number) => {
    const metersPerPixel =
      (156543.03392 * Math.cos((REFERENCE_LATITUDE * Math.PI) / 180)) / Math.pow(2, zoom);
    return (GRADIENT_END_KM * 1000) / metersPerPixel;
  };
</script>

<script lang="ts">
  import type { Garden } from '$lib/types/Garden';
  import type { ContextType } from './Map.svelte';
  import type GeoJSON from 'geojson';

  import { getContext, onDestroy, onMount } from 'svelte';
  import key from './mapbox-context.js';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';

  interface Props {
    gardens: Garden[];
  }

  let { gardens }: Props = $props();

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const sourceId = 'coverage-gardens';
  const heatmapLayerId = 'coverage-heatmap';

  let mapReady = $state(false);

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

  const initializeLayer = () => {
    try {
      map.addSource(sourceId, {
        type: 'geojson',
        data: buildFeatureCollection()
      });

      // An "inverse" heatmap of garden coverage. Because a heatmap paints its whole
      // extent by density, areas with no nearby garden (density 0) are painted red,
      // and the colour shifts to green as we approach a garden.
      //
      // The kernel/colour stops are calibrated (see the module script) so that a
      // single isolated garden reads as:
      //   - solid green out to COVERAGE_RADIUS_KM (15 km),
      //   - a green → yellow → red gradient from there to GRADIENT_END_KM (25 km),
      //   - pure red beyond 25 km.
      map.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: sourceId,
        paint: {
          // Every garden contributes equally.
          'heatmap-weight': 1,
          // Normalizes a single garden's centre density to 1.0 (see HEATMAP_INTENSITY).
          'heatmap-intensity': HEATMAP_INTENSITY,
          // Map the kernel density at each key distance to a colour. Densities are
          // strictly ascending (further away = lower density = redder).
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            // No garden within range at all.
            0,
            rgba(COVERAGE_COLORS.gap),
            // 25 km — outer edge of the gradient, still red.
            densityAtKm(GRADIENT_END_KM),
            rgba(COVERAGE_COLORS.gap),
            // Midpoint of the gradient (20 km) — yellow.
            densityAtKm((COVERAGE_RADIUS_KM + GRADIENT_END_KM) / 2),
            rgba(COVERAGE_COLORS.mid),
            // 15 km — the green plateau begins here.
            densityAtKm(COVERAGE_RADIUS_KM),
            rgba(COVERAGE_COLORS.covered),
            // Garden centre.
            1,
            rgba(COVERAGE_COLORS.covered)
          ],
          // Radius (px) representing GRADIENT_END_KM at each zoom level. The pixel
          // radius mapping to a fixed real-world distance doubles per zoom level, so
          // an exponential (base 2) interpolation between two computed anchor stops
          // reproduces the curve exactly. Anchoring the low stop at zoom 0 (rather
          // than clamping at a higher zoom) is what keeps sparse regions realistically
          // red when zoomed out, instead of a fixed pixel radius ballooning into
          // hundreds of kilometers of false "coverage".
          'heatmap-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0,
            radiusPxAtZoom(0),
            16,
            radiusPxAtZoom(16)
          ],
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

  $effect(() => {
    if (mapReady) {
      map.getSource(sourceId)?.setData(buildFeatureCollection());
    }
  });

  onMount(() => {
    initializeLayer();
  });

  onDestroy(() => {
    // The map instance persists across client-side navigations within the layout,
    // but this component is destroyed when leaving the page; clean up after ourselves.
    if (map.getLayer(heatmapLayerId)) map.removeLayer(heatmapLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  });
</script>
