<script module lang="ts">
  /**
   * The coverage radius, in kilometers, around a single garden that is considered
   * "green" (well covered). Anything further away gradually turns "red".
   */
  export const COVERAGE_RADIUS_KM = 15;

  /**
   * Reference latitude (degrees) used to convert the coverage radius from
   * kilometers to screen pixels. Mapbox's `heatmap-radius` is expressed in
   * pixels, and the meters-per-pixel of a Web Mercator projection depends on the
   * latitude. We pick a latitude central to WTMG's core region (Western Europe)
   * so the rendered radius is accurate there, and only slightly off north/south.
   */
  const REFERENCE_LATITUDE = 50;

  /**
   * Computes the on-screen pixel radius that represents {@link COVERAGE_RADIUS_KM}
   * at a given zoom level and the {@link REFERENCE_LATITUDE}.
   *
   * meters-per-pixel = 156543.03392 * cos(lat) / 2^zoom
   * radius(px) = radius(m) / meters-per-pixel
   */
  const radiusPxAtZoom = (zoom: number) => {
    const metersPerPixel =
      (156543.03392 * Math.cos((REFERENCE_LATITUDE * Math.PI) / 180)) / Math.pow(2, zoom);
    return (COVERAGE_RADIUS_KM * 1000) / metersPerPixel;
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

      // An "inverse" heatmap: where no garden is nearby the density is 0, which we
      // paint red. As we approach a garden (higher density) the colour shifts through
      // orange/amber to green. A single garden's kernel fades to ~0 at its
      // `heatmap-radius`, so the green bloom roughly matches the coverage radius.
      map.addLayer({
        id: heatmapLayerId,
        type: 'heatmap',
        source: sourceId,
        paint: {
          // Every garden contributes equally.
          'heatmap-weight': 1,
          // Keep the accumulated density comparable across zoom levels. The radius
          // already scales with zoom (see below), so a fixed intensity keeps a lone
          // garden's peak roughly constant. Boosted a little so that even an isolated
          // garden's centre reliably reaches the "green" end of the ramp.
          'heatmap-intensity': 1.5,
          // Colour ramp from "no coverage" (red) to "well covered" (green).
          // Green is reached fairly early in the density range so a single garden
          // reads as covered, while areas with no nearby garden (density ~0) stay red.
          // Alpha is baked into the colours so the whole overlay stays translucent
          // and the underlying map remains legible.
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(214, 40, 40, 0.5)',
            0.1,
            'rgba(230, 92, 40, 0.5)',
            0.25,
            'rgba(240, 170, 50, 0.45)',
            0.4,
            'rgba(190, 200, 60, 0.42)',
            0.6,
            'rgba(58, 170, 90, 0.42)',
            1,
            'rgba(40, 150, 75, 0.42)'
          ],
          // Radius (in pixels) that represents COVERAGE_RADIUS_KM at each zoom level.
          // Because the pixel radius that maps to a fixed real-world distance doubles
          // for every zoom level, an exponential (base 2) interpolation between two
          // computed anchor stops reproduces the curve exactly.
          'heatmap-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            4,
            radiusPxAtZoom(4),
            14,
            radiusPxAtZoom(14)
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
