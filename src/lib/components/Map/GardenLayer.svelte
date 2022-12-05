<script lang="ts">
  import type { Garden } from '@/lib/types/Garden.js';
  import type maplibregl from 'maplibre-gl';

  export let allGardens: { [id: string]: Garden };
  export let selectedGardenId: string | null = null;
  export let showGardens: boolean;
  export let showSavedGardens: boolean;
  export let savedGardens = [] as string[];

  import { getContext, createEventDispatcher } from 'svelte';
  import key from './mapbox-context.js';

  type GardenFeatureCollection = {
    type: 'FeatureCollection';
    features: GeoJSON.Feature[];
  };

  const { getMap } = getContext(key);
  const map: maplibregl.Map = getMap();

  const dispatch = createEventDispatcher();

  let mapReady = false;

  const savedGardenSourceId = 'saved-gardens';
  const gardensWithoutSavedGardensSourceId = 'gardens-without-saved-gardens';
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

    Object.values(allGardens).map((garden: Garden) => {
      if (!garden.id) return;

      const gardenId = garden.id;

      let gardenFeature = {
        type: 'Feature',
        properties: {
          id: gardenId,
          ...garden,
          lnglat: [garden.location?.longitude, garden.location?.latitude]
          // icon: selectedGardenId === gardenId ? 'tent-filled' : isSaved ? 'tent-saved' : 'tent'
        },
        geometry: {
          type: 'Point',
          coordinates: [garden.location?.longitude, garden.location?.latitude]
        }
      };

      //check if garden id is in savedGardens
      const isSaved = savedGardens.includes(gardenId);

      // Add garden to allGardens feature collection
      fcAllGardens.features.push(gardenFeature);

      // if garden is saved, add to savedGardens feature collection and if garden is not saved, add to gardensWithoutSavedGardens feature collection
      if (isSaved) fcSavedGardens.features.push(gardenFeature);
      else fcGardensWithoutSavedGardens.features.push(gardenFeature);

      // if garden is selected, add to selectedGarden feature collection
      //const isSelected = selectedGardenId === gardenId;
      //if (isSelected) fcSelectedGarden.features.push(gardenFeature);
    });

    console.log({ fcAllGardens, fcSavedGardens, fcGardensWithoutSavedGardens });
  };

  const onGardenClick = (e: maplibregl.MapMouseEvent) => {
    const garden = e.features?.[0]?.properties;
    dispatch('garden-click', garden);
  };

  const setupMarkers = async () => {
    // Catch all errors to avoid having to reload when working on this component in development
    try {
      const images = [
        { url: '/images/markers/tent-neutral.png', id: 'tent' },
        { url: '/images/markers/tent-filled.png', id: 'tent-filled' },
        { url: '/images/markers/bookmark.png', id: 'tent-bookmark' },
        { url: '/images/markers/tent-white-yellow.png', id: 'tent-saved-selected' },
        { url: '/images/markers/tent-yellow.png', id: 'tent-saved' }
      ];

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

      calculateData();

      // map.addSource('gardens', {
      //   type: 'geojson',
      //   data: data,
      //   cluster: true,
      //   clusterMaxZoom: 14,
      //   clusterRadius: 50
      // });

      map.addSource(gardensWithoutSavedGardensSourceId, {
        type: 'geojson',
        data: fcGardensWithoutSavedGardens,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      map.addSource(savedGardenSourceId, {
        type: 'geojson',
        data: fcSavedGardens
      });

      map.addLayer({
        id: clustersLayerId,
        type: 'circle',
        source: gardensWithoutSavedGardensSourceId,
        filter: ['has', 'point_count'],
        paint: {
          // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step
          //   * Blue, 20px circles when point count is less than 20
          //   * Yellow, 30px circles when point count is between 30 and 40
          //   * Pink, 40px circles when point count is greater than or equal to 40
          // --color-0: '#EC9570'; --color-1: '#F6C4B7'; --color-2: '#F4E27E';
          // --color-3: '#59C29D'; --color-4: '#A2D0D3'; --color-5: '#2E5F63';

          'circle-color': ['step', ['get', 'point_count'], '#A2D0D3', 20, '#EC9570', 80, '#F6C4B7'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 20, 30, 40, 40]
        }
      });

      map.addLayer({
        id: clusterCountLayerId,
        type: 'symbol',
        source: gardensWithoutSavedGardensSourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13
        }
      });

      map.addLayer({
        id: unclusteredPointLayerId,
        type: 'symbol',
        source: gardensWithoutSavedGardensSourceId,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'tent',
          'icon-size': 0.4
        }
      });

      map.addLayer({
        id: savedGardenLayerId,
        type: 'symbol',
        source: savedGardenSourceId,
        layout: {
          'icon-image': 'tent-saved',
          'icon-size': 0.4
        }
      });

      // inspect a cluster on click
      map.on('click', clustersLayerId, (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [clustersLayerId]
        });
        const clusterId = features[0].properties?.cluster_id;
        map
          .getSource(gardensWithoutSavedGardensSourceId)
          .getClusterExpansionZoom(clusterId, function (err, zoom) {
            if (err) return console.log(err);

            map.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          });
      });

      map.on('click', unclusteredPointLayerId, onGardenClick);
      map.on('click', savedGardenLayerId, onGardenClick);

      map.on('mouseenter', clustersLayerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', clustersLayerId, () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('mouseenter', unclusteredPointLayerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', unclusteredPointLayerId, () => {
        map.getCanvas().style.cursor = '';
      });

      map.on('mouseenter', savedGardenLayerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', savedGardenLayerId, () => {
        map.getCanvas().style.cursor = '';
      });
    } catch (err) {
      // should not error in prod
      console.log(err);
    } finally {
      mapReady = true;
    }
  };

  const updateSelectedMarker = (_?: any) => {
    calculateData();
    map.getSource(gardensWithoutSavedGardensSourceId).setData(fcGardensWithoutSavedGardens);
    map.getSource(savedGardenSourceId).setData(fcSavedGardens);
  };

  const updateGardensWithoutSavedGardensVisibility = (visible: boolean) => {
    map.setLayoutProperty(clustersLayerId, 'visibility', visible ? 'visible' : 'none');
    map.setLayoutProperty(clusterCountLayerId, 'visibility', visible ? 'visible' : 'none');
    map.setLayoutProperty(unclusteredPointLayerId, 'visibility', visible ? 'visible' : 'none');
  };

  const updateSavedGardensVisibility = (visible: boolean) => {
    map.setLayoutProperty(savedGardenLayerId, 'visibility', visible ? 'visible' : 'none');
  };

  $: if (mapReady) updateSelectedMarker({ allGardens, savedGardens });

  $: if (mapReady) {
    updateGardensWithoutSavedGardensVisibility(showGardens);
  }

  $: if (mapReady) {
    updateSavedGardensVisibility(showSavedGardens);
  }

  $: {
    if (mapReady)
      if (selectedGardenId) {
        map.setLayoutProperty(unclusteredPointLayerId, 'icon-image', {
          property: 'id',
          type: 'categorical',
          stops: [[selectedGardenId, 'tent-filled']],
          default: 'tent'
        });

        map.setLayoutProperty(savedGardenLayerId, 'icon-image', {
          property: 'id',
          type: 'categorical',
          stops: [[selectedGardenId, 'tent-filled']],
          default: 'tent-saved'
        });
      } else {
        map.setLayoutProperty(unclusteredPointLayerId, 'icon-image', 'tent');
        map.setLayoutProperty(savedGardenLayerId, 'icon-image', 'tent-saved');
      }
  }

  setupMarkers();
</script>
