<script lang="ts">
  import type { Garden } from '$lib/types/Garden';
  import type { ContextType } from './Map.svelte';
  import type maplibregl from 'maplibre-gl';
  import type GeoJSON from 'geojson';

  export let allGardens: Garden[];
  export let selectedGardenId: string | null = null;
  export let showGardens: boolean;
  export let showSavedGardens: boolean;
  export let savedGardens = [] as string[];

  import { getContext, createEventDispatcher } from 'svelte';
  import key from './mapbox-context.js';
  import { tentIcon } from '$lib/images/markers';
  import { nonMemberMaxZoom } from '$lib/constants';
  import { loadImg } from '$lib/api/mapbox';
  import { gardenLayerLoaded } from '$lib/stores/app';
  import * as Sentry from '@sentry/sveltekit';

  type GardenFeatureCollection = {
    type: 'FeatureCollection';
    features: GeoJSON.Feature[];
  };

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const dispatch = createEventDispatcher();

  let mapReady = false;

  const savedGardenSourceId = 'saved-gardens';
  const gardensWithoutSavedGardensSourceId = 'gardens-without-saved-gardens';
  const gardensAllSourceId = 'gardens-all';
  const savedGardenLayerId = 'saved-gardens-layer';
  const clustersLayerId = 'clusters';
  const clusterCountLayerId = 'cluster-count';
  const unclusteredPointLayerId = 'unclustered-point';

  const fcAllGardens: GardenFeatureCollection = {
    type: 'FeatureCollection',
    features: []
  };
  const fcSavedGardens: GardenFeatureCollection = {
    type: 'FeatureCollection',
    features: []
  };
  const fcGardensWithoutSavedGardens: GardenFeatureCollection = {
    type: 'FeatureCollection',
    features: []
  };

  const calculateData = () => {
    fcAllGardens.features = [];
    fcSavedGardens.features = [];
    fcGardensWithoutSavedGardens.features = [];

    allGardens.forEach((garden: Garden) => {
      if (!garden.id) return;

      const gardenId = garden.id;
      // Check if garden id is in savedGardens
      const isSaved = savedGardens.includes(gardenId);

      let gardenFeature = {
        type: 'Feature',
        properties: {
          id: gardenId,
          ...garden,
          // icon: isSaved ? 'tent-saved' : 'tent',
          icon:
            isSaved && selectedGardenId === gardenId
              ? 'tent-saved-selected' // selected saved garden
              : selectedGardenId === gardenId
                ? 'tent-filled' // selected garden
                : isSaved
                  ? 'tent-saved' // saved garden
                  : 'tent', // garden
          lnglat: [garden.location?.longitude, garden.location?.latitude]
        },
        geometry: {
          type: 'Point',
          coordinates: [garden.location?.longitude, garden.location?.latitude]
        }
      };

      // Add garden to allGardens feature collection
      fcAllGardens.features.push(gardenFeature);

      // if garden is saved, add to savedGardens feature collection and if garden is not saved, add to gardensWithoutSavedGardens feature collection
      if (isSaved) fcSavedGardens.features.push(gardenFeature);
      else fcGardensWithoutSavedGardens.features.push(gardenFeature);

      // if garden is selected, add to selectedGarden feature collection
      //const isSelected = selectedGardenId === gardenId;
      //if (isSelected) fcSelectedGarden.features.push(gardenFeature);
    });
  };

  const onGardenClick = (e: maplibregl.MapMouseEvent) => {
    const garden = e.features?.[0]?.properties;
    dispatch('garden-click', garden);
  };

  const addTentImageToMap = async (
    id: string,
    colors: {
      tentBackgroundColor: string;
      tentColor: string;
      backGroundColor: string;
    }
  ) => {
    const tentBackgroundColor = '**tentBackgroundColor**';
    const tentColor = '**tentColor**';
    const backGroundColor = '**backGroundColor**';

    let icon = tentIcon;
    if (colors?.tentBackgroundColor)
      icon = icon.replaceAll(tentBackgroundColor, colors.tentBackgroundColor);
    if (colors?.tentColor) icon = icon.replaceAll(tentColor, colors.tentColor);
    if (colors?.backGroundColor) icon = icon.replaceAll(backGroundColor, colors.backGroundColor);
    new Promise((resolve) => {
      let img = new Image(100, 100);
      img.onload = () => {
        if (!map.hasImage(id)) map.addImage(id, img);
        resolve(true);
      };
      img.src = 'data:image/svg+xml;  ,' + btoa(icon);
    }).catch((err) => {
      // should not error in prod
      console.log(err);
    });
  };

  const addImages = async () => {
    const colorTentYellow = '#FFF8CE';
    const colorTentDarkYellow = '#F4E27E';
    const colorTentDarkGreen = '#495747';
    const colorTentWhite = '#FFF';

    const icons = [
      {
        colors: {
          tentBackgroundColor: colorTentWhite,
          tentColor: colorTentDarkGreen,
          backGroundColor: colorTentWhite
        },
        id: 'tent'
      },
      {
        colors: {
          tentBackgroundColor: colorTentDarkGreen,
          tentColor: colorTentWhite,
          backGroundColor: colorTentDarkGreen
        },
        id: 'tent-filled'
      },
      {
        colors: {
          tentBackgroundColor: colorTentYellow,
          tentColor: colorTentDarkGreen,
          backGroundColor: colorTentWhite
        },
        id: 'tent-saved-selected'
      },
      {
        colors: {
          tentBackgroundColor: colorTentYellow,
          tentColor: colorTentDarkGreen,
          backGroundColor: colorTentDarkYellow
        },
        id: 'tent-saved'
      }
    ];

    await Promise.all(icons.map((icon) => addTentImageToMap(icon.id, icon.colors)));
  };

  function addPointerOnHover(layerId: string) {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  }

  const setupMarkers = async () => {
    // Catch all errors to avoid having to reload when working on this component in development
    try {
      const images = [
        { url: '/images/markers/tent-neutral.png', id: 'tent' },
        { url: '/images/markers/tent-filled.png', id: 'tent-filled' },
        { url: '/images/markers/tent-yellow-dark.png', id: 'tent-saved-selected' },
        { url: '/images/markers/tent-yellow.png', id: 'tent-saved' }
      ];

      await Promise.all(images.map((img) => loadImg(map, img)));

      calculateData();

      // map.addSource('gardens', {
      //   type: 'geojson',
      //   data: data,
      //   cluster: true,
      //   clusterMaxZoom: 14,
      //   clusterRadius: 50
      // });

      map.addSource(gardensAllSourceId, {
        type: 'geojson',
        data: fcAllGardens,
        cluster: true,
        /** Max zoom on which to cluster points if clustering is enabled.
         * Defaults to one zoom less than maxzoom (so that last zoom features are not clustered).
         * https://docs.mapbox.com/mapbox-gl-js/style-spec/sources/#geojson-clusterMaxZoom
         *
         * Note: the non-member max zoom should be more zoomed out than the member max zoom.
         */
        clusterMaxZoom: nonMemberMaxZoom - 1,
        clusterRadius: 50
      });

      map.addSource(savedGardenSourceId, {
        type: 'geojson',
        data: fcSavedGardens
      });

      map.addLayer({
        id: clustersLayerId,
        type: 'circle',
        source: gardensAllSourceId,
        filter: ['has', 'point_count'],
        paint: {
          // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step
          //   * Blue, 20px circles when point count is less than 20
          //   * Yellow, 30px circles when point count is between 30 and 40
          //   * Pink, 40px circles when point count is greater than or equal to 40
          // --color-0: '#EC9570'; --color-1: '#F6C4B7'; --color-2: '#F4E27E';
          // --color-3: '#59C29D'; --color-4: '#A2D0D3'; --color-5: '#2E5F63';

          // 'circle-color': ['step', ['get', 'point_count'], '#A2D0D3', 20, '#F6C4B7', 80, '#EC9570'],
          // 'circle-radius': ['step', ['get', 'point_count'], 20, 20, 30, 40, 40]

          // Original colors and sizes
          'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 20, '#f1f075', 40, '#f28cb1'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 20, 30, 40, 40]
        }
      });

      map.addLayer({
        id: clusterCountLayerId,
        type: 'symbol',
        source: gardensAllSourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13
          // 'text-allow-overlap': true
        }
      });

      map.addLayer({
        id: unclusteredPointLayerId,
        type: 'symbol',
        source: gardensAllSourceId,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.4,
          // Needs to be true, otherwise a city/town name on the map will overlap a garden.
          // http://localhost:5173/explore/garden/XFVhmDog6xQprHRJuy1UkThRUVh2 and the name "Spalbeek"
          'icon-allow-overlap': true
        }
      });

      map.addLayer({
        id: savedGardenLayerId,
        type: 'symbol',
        source: savedGardenSourceId,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.4,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      });

      // inspect a cluster on click
      map.on('click', clustersLayerId, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [clustersLayerId]
        });
        const clusterId = features[0].properties?.cluster_id;
        map.getSource(gardensAllSourceId).getClusterExpansionZoom(clusterId, function (err, zoom) {
          if (err) return console.log(err);

          map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          });
        });
      });

      map.on('click', unclusteredPointLayerId, onGardenClick);
      map.on('click', savedGardenLayerId, onGardenClick);

      [clustersLayerId, unclusteredPointLayerId, savedGardenLayerId].forEach(addPointerOnHover);
    } catch (err) {
      // should not error in prod
      console.error(err);
      Sentry.captureException(err, {
        extra: { context: 'Setting up garden map markers' }
      });
    } finally {
      mapReady = true;
      $gardenLayerLoaded = true;
    }
  };

  const updateAll = (..._: any) => {
    calculateData();
    map.getSource(gardensAllSourceId).setData(fcAllGardens);
    map.getSource(savedGardenSourceId).setData(fcSavedGardens);
  };

  const updateVisibility = (..._: any) => {
    updateGardensAllVisibility(showGardens);
    updateSavedGardensVisibility(showSavedGardens);
  };

  const updateGardensAllVisibility = (visible: boolean) => {
    map.setLayoutProperty(clustersLayerId, 'visibility', visible ? 'visible' : 'none');
    map.setLayoutProperty(clusterCountLayerId, 'visibility', visible ? 'visible' : 'none');
    map.setLayoutProperty(unclusteredPointLayerId, 'visibility', visible ? 'visible' : 'none');
  };

  const updateSavedGardensVisibility = (visible: boolean) => {
    map.setLayoutProperty(savedGardenLayerId, 'visibility', visible ? 'visible' : 'none');
  };

  const updateSelectedMarker = (_?: any) => {
    calculateData();
    map.getSource(gardensAllSourceId).setData(fcAllGardens);
    map.getSource(savedGardenSourceId).setData(fcSavedGardens);
  };

  const updateGardensWithoutSavedGardensVisibility = (visible: boolean) => {
    map.setLayoutProperty(clustersLayerId, 'visibility', visible ? 'visible' : 'none');
    map.setLayoutProperty(clusterCountLayerId, 'visibility', visible ? 'visible' : 'none');
    map.setLayoutProperty(unclusteredPointLayerId, 'visibility', visible ? 'visible' : 'none');
  };

  // update featurecollections when allGardens or savedGardens change and selectedGardenId
  $: if (mapReady) updateAll(selectedGardenId, savedGardens, allGardens);
  // Update visibility when showGardens or showSavedGardens change
  $: if (mapReady) updateVisibility(showGardens, showSavedGardens);

  // $: if (mapReady) {
  //   updateSavedGardensVisibility(showSavedGardens);
  // }

  // $: if (mapReady) updateSelectedMarker({ allGardens, savedGardens });
  // Instead of recalculate the data every time, we could use a mapbox expression
  // $: {
  //   if (mapReady)
  //     if (selectedGardenId) {
  //       map.setLayoutProperty(unclusteredPointLayerId, 'icon-image', {
  //         property: 'id',
  //         type: 'categorical',
  //         stops: [[selectedGardenId, 'tent-filled']],
  //         default: 'tent'
  //       });

  //       map.setLayoutProperty(savedGardenLayerId, 'icon-image', {
  //         property: 'id',
  //         type: 'categorical',
  //         stops: [[selectedGardenId, 'tent-filled']],
  //         default: 'tent-saved'
  //       });
  //     } else {
  //       map.setLayoutProperty(unclusteredPointLayerId, 'icon-image', 'tent');
  //       map.setLayoutProperty(savedGardenLayerId, 'icon-image', 'tent-saved');
  //     }
  // }

  setupMarkers();
</script>
