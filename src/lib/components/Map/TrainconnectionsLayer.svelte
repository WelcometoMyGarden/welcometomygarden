<script lang="ts">
  import type { AnyLayer, GeoJSONSourceRaw } from 'maplibre-gl';
  import mapboxgl from 'maplibre-gl';
  import { getContext, onMount } from 'svelte';
  import key from './mapbox-context.js';
  import {
    addTrainconnectionsDataLayers,
    trainconnectionsDataLayers
  } from '@/lib/stores/trainconnections.js';

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

  // helpers
  const createPopup = () =>
    new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: 'none',
      anchor: 'top',
      className: 'trainconnections-popup',
      offset: 15
    });

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
        'icon-image': 'train',
        'icon-size': 0.4,
        'icon-ignore-placement': true
      }
    };

    // return {
    //   id,
    //   type: 'circle',
    //   source,
    //   paint: {
    //     'circle-radius': [
    //       'interpolate',
    //       ['linear'],
    //       ['zoom'],
    //       4.5,
    //       ['*', 4.5, ['/', 2, ['number', ['get', 'type']]]], // origin = 1, destination = 2
    //       15,
    //       ['*', 12, ['/', 2, ['number', ['get', 'type']]]] // origin = 1, destination = 2
    //     ],
    //     'circle-color': [
    //       'interpolate',
    //       ['linear'],
    //       ['number', ['get', 'duration']],
    //       -1,
    //       durationCategoryColour(-1), // unknown duration
    //       0,
    //       durationCategoryColour(0), // 0
    //       1,
    //       durationCategoryColour(1), // < 1h
    //       2,
    //       durationCategoryColour(2), // 1h-2h
    //       3,
    //       durationCategoryColour(3), // 2h-4h
    //       4,
    //       durationCategoryColour(4), // 4h-8h
    //       5,
    //       durationCategoryColour(5), // 8h-16h
    //       6,
    //       durationCategoryColour(6) // > 16h
    //     ],
    //     'circle-stroke-color': '#333',
    //     'circle-stroke-width': 0.5
    //   }
    // };
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

  const convertToFeatureList = (stations: Station[]): GeoJSON.Feature[] => {
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

  const create = async (
    origin: {
      location: { longitude: number; latitude: number };
      name: string;
      id: number;
    },
    layerId: string
  ): Promise<void> => {
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
      type: 'FeatureCollection',
      features: []
    };

    const stationFeature: GeoJSON.Feature = {
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

    geojson.features = convertToFeatureList(stationsList);
    geojson.features.push(stationFeature);

    const source: GeoJSONSourceRaw = {
      type: 'geojson',
      data: geojson
    };
    map.addSource(layerId, source);
    map.addLayer(createLayer(layerId, layerId));

    geojson.features.forEach((feat) => {
      const { name, duration, durationMinutes } = feat.properties;

      let popup = createPopup();
      let durationElement = ` <b>${durationMinutes} min.</b>`;
      popup.setLngLat(feat.geometry.coordinates).setHTML(`${durationElement}`).addTo(map);
    });
  };

  let prevFileDataLayerIds: string[] = [];

  // Subscribe to trainconnectionsDataLayers store and update map layers accordingly when it changes
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
    } catch (err) {
      // should not error in prod
      console.log(err);
    } finally {
      mapReady = true;
    }
  };

  setup();

  /* 
    const origin = {
      location: {
        longitude: 4.71613883972168,
        latitude: 50.88153913009131
      },
      name: 'Leuven',
      id: 8800011
    };
  */
</script>

<style>
  :global(.trainconnections-popup) {
    cursor: auto;
  }

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
</style>
