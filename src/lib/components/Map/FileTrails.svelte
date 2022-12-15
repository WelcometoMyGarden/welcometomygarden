<script lang="ts">
  import { fileDataLayers, prefix, updateFileDataLayers } from '@/lib/stores/file';
  import type { ContextType } from './Map.svelte';
  import { onMount, getContext } from 'svelte';
  import bbox from '@turf/bbox';
  import key from './mapbox-context.js';
  import { ZOOM_LEVELS } from '@/lib/constants.js';

  type SourceData =
    | string
    | GeoJSON.Feature<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>
    | GeoJSON.FeatureCollection<GeoJSON.Geometry, GeoJSON.GeoJsonProperties>
    | undefined;

  // @ts-ignore
  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const updateVisibility = (id: string, visible?: boolean) => {
    const layer = map.getLayer(id);
    if (layer) {
      if (visible) map.setLayoutProperty(id, 'visibility', 'visible');
      else map.setLayoutProperty(id, 'visibility', 'none');
    }
  };

  const addTrail = (geoJson: SourceData, id: string) => {
    try {
      const bboxBounds = <[number, number, number, number]>bbox(geoJson).slice(0, 4);
      map.fitBounds(bboxBounds, {
        padding: {
          top: 150,
          bottom: 150,
          left: 50,
          right: 50
        },
        maxZoom: ZOOM_LEVELS.ROAD,
        linear: true
      });
    } catch (error) {
      console.error(error);
    }

    if (map.getSource(id)) {
      map.getSource(id).setData(geoJson);
    } else {
      map.addSource(id, {
        type: 'geojson',
        data: geoJson
      });
    }

    if (!map.getLayer(id)) {
      map.addLayer({
        id,
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
    }
  };

  const getFileDataLayerIdsOnMap = () => {
    const fileDataLayerIdsOnMap: string[] = [];

    map.getStyle().layers?.map((layer) => {
      if (layer.id.includes(prefix)) {
        // Instead of returning the layer ID, we could return the layer object

        // const fileDataLayer: FileDataLayer = {
        //   id: layer.id,
        //   name: layer.id,
        //   visible: layer.layout?.visibility === 'visible',
        //   geoJson: map.getSource(layer.id)?.data
        // };

        fileDataLayerIdsOnMap.push(layer.id);
      }
    });

    return fileDataLayerIdsOnMap;
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

    // TODO: Discussion
    // We should get the prevFileDataLayerIds from the map, not from the variable; otherwise, we might miss layers that were added to the map
    // but not yet added to the store (e.g. when a new file is loaded)
    // fileDataLayerIds = getFileDataLayerIdsOnMap();

    const idsToAdd = fileDataLayerIds.filter((id) => !prevFileDataLayerIds.includes(id)); // IDs that are in the new data, but not in the old data
    const idsToRemove = prevFileDataLayerIds.filter((id) => !fileDataLayerIds.includes(id)); // IDs that are in the old data, but not in the new data
    const idsToUpdate = fileDataLayerIds.filter((id) => prevFileDataLayerIds.includes(id)); // IDs that are in both the old and new data

    // TODO: remove logs
    if (false) {
      console.log('---');
      console.log('getFileDataLayerIdsOnMap', getFileDataLayerIdsOnMap());
      console.log('prev ids', prevFileDataLayerIds);
      console.log('ids', fileDataLayerIds);
      console.log('idsToAdd', idsToAdd);
      console.log('idsToRemove', idsToRemove);
      console.log('idsToUpdate', idsToUpdate);
      console.log('---');
    }

    // Check

    // Add new layers
    idsToAdd.map((id) => {
      const fileDataLayer = fileDataLayers.find((fileDataLayer) => fileDataLayer.id === id);
      if (fileDataLayer) addTrail(fileDataLayer.geoJson, id);
    });

    // Remove old layers
    idsToRemove.map((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });

    // Update visibility of existing layers
    idsToUpdate.map((id) => {
      const fileDataLayer = fileDataLayers.find((fileDataLayer) => fileDataLayer.id === id);
      if (fileDataLayer) updateVisibility(id, fileDataLayer.visible);
    });

    prevFileDataLayerIds = fileDataLayerIds;
  });
</script>
