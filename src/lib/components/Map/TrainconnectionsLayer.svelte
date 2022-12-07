<script lang="ts">
  import { ZOOM_LEVELS } from '$lib/constants';
  import type { AnyLayer, GeoJSONSourceRaw } from 'maplibre-gl';
  import mapboxgl from 'maplibre-gl';
  import { getContext, onMount } from 'svelte';
  import key from './mapbox-context.js';
  import {
    addTrainconnectionsDataLayers,
    trainconnectionsDataLayers
  } from '@/lib/stores/trainconnections.js';
  import { trainTimeIcon } from '@/lib/images/icons/index.js';
  import type { OriginStation } from '@/lib/types/DataLayer.js';

  // @ts-ignore
  const { getMap } = getContext(key);
  const map: mapboxgl.Map = getMap();

  interface Station {
    id: string;
    name: string;
    location: {
      type: 'location';
      id: string;
      latitude: number;
      longitude: number;
    };
    duration: number;
  }

  const apiUrls = <string>import.meta.env.VITE_DIRECT_TRAIN_API_URLS;

  let mapReady = false;
  let popUpsAlwaysVisible = false;

  // helpers
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

  const createPopupHtml = (properties: any) => {
    const { name, duration, durationMinutes, type, fromName } = properties;

    if (type == 2)
      return `
  <div>
    <div class="dtc-popup-text">
      <span>${fromName}</span>
      <span>&#8594</span>
      <span>${name}</span>
    </div>
    <div class="dtc-popup-tag">~ ${durationMinutes} min.</div>
  </div>`;
    else {
      return name;
    }
  };

  const formatStationId = (i: string) => (i.length === 9 && i.slice(0, 2) ? i.slice(2) : i);

  const locationToPoint = (location: { longitude: number; latitude: number }): GeoJSON.Point => ({
    type: 'Point',
    coordinates: [location.longitude, location.latitude]
  });

  const durationCategory = (d: number): number => {
    if (d === 0) return 0;
    if (!d) return -1;
    if (d > 0 && d <= 60) return 1;
    if (d > 0 && d <= 120) return 2;
    if (d > 0 && d <= 240) return 3;
    if (d > 0 && d <= 480) return 4;
    if (d > 0 && d <= 960) return 5;
    return 6;
  };

  const durationCategoryColour = (c: number) => {
    if (c === -1) return '#999'; // unknown duration
    if (c === 0) return '#333'; // 0
    if (c === 1) return '#191'; // < 1h
    if (c === 2) return '#2d1'; // 1h-2h
    if (c === 3) return '#d4d411'; // 2h-4h
    if (c === 4) return '#d91'; // 4h-8h
    if (c === 5) return '#d41'; // 8h-16h
    if (c === 6) return '#a41'; // > 16h
    return '#999';
  };

  const createLayer = (id: string, source: any): AnyLayer => {
    return {
      id,
      type: 'symbol',
      source,
      layout: {
        'icon-ignore-placement': true,
        'icon-image': {
          property: 'duration',
          stops: [
            [-1, 'train-time--1'],
            [0, 'train-time-0'],
            [1, 'train-time-1'],
            [2, 'train-time-2'],
            [3, 'train-time-3'],
            [4, 'train-time-4'],
            [5, 'train-time-5'],
            [6, 'train-time-6']
          ]
        },
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.2,
          ZOOM_LEVELS.SMALL_COUNTRY,
          0.3,
          ZOOM_LEVELS.CITY,
          0.4,
          ZOOM_LEVELS.ROAD,
          0.4
        ]
      }
    };
  };

  // functions

  const fetchDirectConnections = async (id: string): Promise<Station[]> => {
    const urls = apiUrls ? apiUrls.split(',') : [];
    if (!urls.length) throw new Error('No API URLs provided');
    // const urlA = new URL(`https://api.direkt.bahn.guru/${formatStationId(id)}`);

    const fetchUrls = urls.map((url) => fetch(new URL(`${url}/${formatStationId(id)}`)));

    const resp = await Promise.any<any>(fetchUrls);
    return await resp.json();
  };

  const convertToFeatureList = (
    stations: Station[],
    fromStationName: string
  ): GeoJSON.Feature[] => {
    const resultsWithLocations = stations
      .map((s) => ({
        ...s,
        location: s.location
      }))
      .filter((s) => !!s.location);

    const features: GeoJSON.Feature[] = resultsWithLocations
      .map(
        (s): GeoJSON.Feature => ({
          type: 'Feature',
          geometry: locationToPoint(s.location),
          properties: {
            type: 2,
            name: s.name,
            fromName: fromStationName,
            duration: durationCategory(s.duration),
            durationMinutes: s.duration
          }
        })
      )
      .sort((a, b) => a.properties?.duration - b.properties?.duration);

    return features;
  };

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

    const source: GeoJSONSourceRaw = {
      type: 'geojson',
      data: geojson
    };
    map.addSource(layerId, source);
    map.addLayer(createLayer(layerId, layerId));

    if (popUpsAlwaysVisible) createPopupsForLayer(geojson.features);
    else {
      map.on('mouseenter', layerId, (e) => {
        console.log(e);
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

  const addTrainTimeImage = async (id: string, color: string) => {
    const borderColor = '#04BC16';

    new Promise((resolve) => {
      let icon = trainTimeIcon;
      icon = icon.replace(borderColor, color);
      let img = new Image(100, 100);
      img.onload = () => {
        if (!map.hasImage(id)) map.addImage(id, img);
        console.log('added image', id, color, map.hasImage(id));
        resolve(true);
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(icon);
    }).catch((err) => {
      // should not error in prod
      console.log(err);
    });
  };

  const setup = async () => {
    // Catch all errors to avoid having to reload when working on this component in development
    try {
      const images = [{ url: '/images/markers/train.png', id: 'train' }];

      await Promise.all(
        images.map((img) =>
          new Promise((resolve) => {
            map.loadImage(img.url, (err, res) => {
              if (!map.hasImage(img.id)) map.addImage(img.id, res);
              resolve(true);
            });
          }).catch((err) => {
            // should not error in prod
            console.log(err);
          })
        )
      );

      for (let i = -1; i <= 6; i++) {
        await addTrainTimeImage(`train-time-${i}`, durationCategoryColour(i));
      }

      // await addTrainTimeImage('train-time--1', '#999');
      // await addTrainTimeImage('train-time-0', '#333');
      // await addTrainTimeImage('train-time-1', '#191');
      // await addTrainTimeImage('train-time-2', '#2d1');
      // await addTrainTimeImage('train-time-3', '#d4d411');
      // await addTrainTimeImage('train-time-4', '#d91');
      // await addTrainTimeImage('train-time-5', '#d41');
      // await addTrainTimeImage('train-time-6', '#a41');
    } catch (err) {
      // should not error in prod
      console.log(err);
    } finally {
      mapReady = true;
    }
  };

  // const origin = {
  //   location: {
  //     longitude: 4.71613883972168,
  //     latitude: 50.88153913009131
  //   },
  //   name: 'Leuven',
  //   id: 8800011
  // };
  // $: mapReady ? addTrainconnectionsDataLayers(origin) : null;

  // Subscribe to trainconnectionsDataLayers store and update map layers accordingly when it changes
  let prevFileDataLayerIds: string[] = [];
  trainconnectionsDataLayers.subscribe((trainDLs) => {
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
