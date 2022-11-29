<script lang="ts">
  import { fileDataLayers, updateFileDataLayers } from '@/lib/stores/file';
  import { onMount, getContext } from 'svelte';
  import bbox from '@turf/bbox';
  import type mapboxgl from 'maplibre-gl';
  import key from './mapbox-context.js';
  import { ZOOM_LEVELS } from '@/lib/constants.js';

  type SourceData =
    | string
    | GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>
    | GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>
    | undefined;

  // @ts-ignore
  const { getMap } = getContext(key);
  const map: mapboxgl.Map = getMap();

  const updateVisibility = (id: string, visible?: boolean) => {
    const layer = map.getLayer(id);
    if (layer) {
      if (visible) map.setLayoutProperty(id, 'visibility', 'visible');
      else map.setLayoutProperty(id, 'visibility', 'none');
    }
  };

  const addTrail = (geoJson: SourceData, id: string) => {
    const bboxBounds = <[number, number, number, number]>bbox(geoJson);
    map.fitBounds(bboxBounds, {
      padding: {
        top: 150,
        bottom: 50,
        left: 50,
        right: 50
      },
      maxZoom: ZOOM_LEVELS.ROAD,
      linear: true
    });

    map.addSource(id, {
      type: 'geojson',
      data: geoJson
    });

    map.addLayer({
      id: id,
      type: 'line',
      source: id,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-width': 7,
        'line-color': 'indigo',
        'line-opacity': 0.7
      }
    });
  };

  const setup = async (geoJson?: SourceData) => {
    map.addSource('trail', {
      type: 'geojson',
      data: geoJson || {
        type: 'FeatureCollection',
        features: []
      }
    });

    map.addLayer({
      id: 'trail-line',
      source: 'trail',
      type: 'line',
      paint: {
        'line-width': 7,
        'line-color': 'indigo',
        'line-opacity': 0.7
      }
    });
    map.addLayer({
      id: 'trail-points',
      source: 'trail',
      type: 'circle',
      paint: {
        'circle-color': 'indigo',
        'circle-radius': 7,
        'circle-opacity': 0.9,
        'circle-stroke-color': '#333',
        'circle-stroke-width': 0.5
      }
    });
  };

  let prevFileDataLayerIds: string[] = [];

  // Subscribe to fileDataLayers store and update map layers accordingly when it changes (e.g. when a new file is loaded)
  fileDataLayers.subscribe((fileDataLayers) => {
    const fileDataLayerIds = fileDataLayers.map((fileDataLayer) => fileDataLayer.id);
    // const currentFileDataLayer = getFileDataLayersOnMap() -> returns visibility state, id, ... in the ame FileDataLayer structure
    //    via prefixing

    // Use set methods: difference, intersection
    // idsToUpdate = intersection(newDataLayers, oldDataLayers)
    //   deze hebben misschien een visibility update: set them all!
    // idsToAdd = difference() // hetgeen dat niet in A zit, maar wel in B
    // idsToRemove = difference() // het geen dat in A zit, maar niet in B

    const idsToAdd = fileDataLayerIds.filter((id) => !prevFileDataLayerIds.includes(id)); // IDs that are in the new data, but not in the old data
    const idsToRemove = prevFileDataLayerIds.filter((id) => !fileDataLayerIds.includes(id)); // IDs that are in the old data, but not in the new data
    const idsToUpdate = fileDataLayerIds.filter((id) => prevFileDataLayerIds.includes(id)); // IDs that are in both the old and new data

    console.log('prev ids', prevFileDataLayerIds);
    console.log('ids', fileDataLayerIds);
    console.log('idsToAdd', idsToAdd);
    console.log('idsToRemove', idsToRemove);
    console.log('idsToUpdate', idsToUpdate);

    // Check

    fileDataLayers.map((fileDataLayer) => {
      if (!(fileDataLayer && fileDataLayer.geoJson && fileDataLayer.id && fileDataLayer.name))
        return;
      if (idsToAdd.length > 0 && idsToAdd.includes(fileDataLayer.id)) {
        addTrail(fileDataLayer.geoJson, fileDataLayer.name);
        // Update state to 'created' so that this layer is not added again
        // Extra uneccessary trigger of a subscribe that doesnt change anything
        updateFileDataLayers(fileDataLayer.id, {
          ...fileDataLayer,
          state: 'created',
          visible: true
        });
      } else updateVisibility(fileDataLayer.id, fileDataLayer.visible);
    });

    prevFileDataLayerIds = fileDataLayerIds;
  });
</script>
