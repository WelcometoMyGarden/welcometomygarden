<script lang="ts">
  import { ICON_SIZE } from '$lib/constants';
  import { trainTimeIcon } from '@/lib/images/markers/index.js';
  import { trainconnectionsDataLayers } from '@/lib/stores/trainconnections.js';
  import type { OriginStation } from '@/lib/types/DataLayer.js';
  import {
    convertToFeatureList,
    createPopupHtml,
    durationCategory,
    durationCategoryColour,
    fetchDirectConnections,
    locationToPoint
  } from '@/lib/util/map/trainConnections.js';
  import type { LayerSpecification, GeoJSONSourceSpecification } from 'maplibre-gl';
  import mapboxgl from 'maplibre-gl';
  import { getContext, onDestroy } from 'svelte';
  import key from './mapbox-context.js';

  // @ts-ignore
  const { getMap } = getContext(key);
  const map: mapboxgl.Map = getMap();

  let mapReady = false;
  let popUpsAlwaysVisible = false;
  const trainTime = 'train-time-';

  const createFixedPopup = () =>
    new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: 'none',
      anchor: 'top',
      className: 'trainconnections-popup',
      offset: 15
    });

  const singlePopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    maxWidth: 'none',
    anchor: 'top',
    className: 'trainconnections-popup-single',
    offset: 10
  });

  const createLayer = (id: string, source: any): LayerSpecification => {
    return {
      id,
      type: 'symbol',
      source,
      layout: {
        'icon-ignore-placement': true,
        'icon-image': {
          property: 'duration',
          stops: [
            [-1, trainTime + '-1'],
            [0, trainTime + '0'],
            [1, trainTime + '1'],
            [2, trainTime + '2'],
            [3, trainTime + '3'],
            [4, trainTime + '4'],
            [5, trainTime + '5'],
            [6, trainTime + '6']
          ]
        },
        'icon-size': ICON_SIZE
      }
    };
  };

  // functions

  const updateVisibility = (id: string, visible?: boolean) => {
    const layer = map.getLayer(id);
    if (layer) {
      if (visible) map.setLayoutProperty(id, 'visibility', 'visible');
      else map.setLayoutProperty(id, 'visibility', 'none');
    }
  };

  const createPopupsForLayer = (
    features: {
      properties: { name: string; duration: number; durationMinutes: number };
      geometry: { coordinates: [number, number] };
    }[]
  ) => {
    features.forEach((feat) => {
      const { name, duration, durationMinutes } = feat.properties;

      let popup = createFixedPopup();
      let durationElement = ` <b>${durationMinutes} min.</b>`;
      popup.setLngLat(feat.geometry.coordinates).setHTML(`${durationElement}`).addTo(map);
    });
  };

  const addTrainTimeImageToMap = async (id: string, color: string) => {
    const borderColor = '#04BC16';

    new Promise((resolve) => {
      let icon = trainTimeIcon;
      icon = icon.replace(borderColor, color);
      let img = new Image(100, 100);
      img.onload = () => {
        if (!map.hasImage(id)) map.addImage(id, img);
        resolve(true);
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(icon);
    }).catch((err) => {
      // should not error in prod
      console.log(err);
    });
  };

  const create = async (origin: OriginStation, layerId: string): Promise<void> => {
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
      type: 'FeatureCollection',
      features: []
    };

    const fromStationFeature: GeoJSON.Feature = {
      type: 'Feature',
      geometry: locationToPoint(origin.location),
      properties: {
        type: 1,
        name: origin.name,
        duration: durationCategory(0),
        durationMinutes: 0
      }
    };

    const stationsList = await fetchDirectConnections(origin.id.toString());

    geojson.features = convertToFeatureList(stationsList, origin.name);
    geojson.features.push(fromStationFeature);

    const source: GeoJSONSourceSpecification = {
      type: 'geojson',
      data: geojson
    };
    map.addSource(layerId, source);
    map.addLayer(createLayer(layerId, layerId));

    if (popUpsAlwaysVisible) createPopupsForLayer(geojson.features);
    else {
      map.on('mouseenter', layerId, (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();

        singlePopup
          .setLngLat(coordinates)
          .setHTML(createPopupHtml({ ...e.features[0].properties }))
          .addTo(map);
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', layerId, (e) => {
        map.getCanvas().style.cursor = '';
        singlePopup.remove();
      });
    }
  };

  const setup = async () => {
    // Catch all errors to avoid having to reload when working on this component in development
    try {
      for (let i = -1; i <= 6; i++) {
        await addTrainTimeImageToMap(trainTime + i, durationCategoryColour(i));
      }
    } catch (err) {
      // should not error in prod
      console.log(err);
    } finally {
      mapReady = true;
    }
  };

  // $: if (mapReady) {
  //   const origin = {
  //     location: {
  //       longitude: 4.71613883972168,
  //       latitude: 50.88153913009131
  //     },
  //     name: 'Leuven',
  //     id: 8800011
  //   };
  //   addTrainconnectionsDataLayers(origin);
  // }

  // Subscribe to trainconnectionsDataLayers store and update map layers accordingly when it changes
  let prevFileDataLayerIds: string[] = [];
  const trainconnectionsDataLayersUnsubscribe = trainconnectionsDataLayers.subscribe((trainDLs) => {
    const dataLayerIds = trainDLs.map((dataLayer) => dataLayer.id);

    const idsToAdd = dataLayerIds.filter((id) => !prevFileDataLayerIds.includes(id)); // IDs that are in the new data, but not in the old data
    const idsToRemove = prevFileDataLayerIds.filter((id) => !dataLayerIds.includes(id)); // IDs that are in the old data, but not in the new data
    const idsToUpdate = dataLayerIds.filter((id) => prevFileDataLayerIds.includes(id)); // IDs that are in both the old and new data

    // Add new layers
    idsToAdd.map((id) => {
      const dataLayer = trainDLs.find((dataLayer) => dataLayer.id === id);
      if (dataLayer) create(dataLayer.originStation, id);
    });

    // Remove old layers
    idsToRemove.map((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });

    // Update visibility of existing layers
    idsToUpdate.map((id) => {
      const dataLayer = trainDLs.find((dataLayer) => dataLayer.id === id);
      if (dataLayer) updateVisibility(id, dataLayer.visible);
    });

    prevFileDataLayerIds = dataLayerIds;
  });

  onDestroy(trainconnectionsDataLayersUnsubscribe);

  setup();
</script>

<style>
  :global(.trainconnections-popup .mapboxgl-popup-content) {
    padding: 0.2rem 1rem;
    border-radius: 3rem;
    border: 1px solid #c9c9c9;
    border-top: none;

    font-size: 1.4rem;
    line-height: 1.4;
    font-weight: bold;

    cursor: pointer;
  }

  :global(.trainconnections-popup-single .mapboxgl-popup-content) {
    padding: 0.2rem 1rem;
    border: 1px solid #c9c9c9;
    border-top: none;

    font-size: 1.4rem;
    line-height: 1.4;

    cursor: pointer;
  }
</style>
