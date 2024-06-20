<script lang="ts">
  import type { Garden } from '$lib/types/Garden.js';
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

  type GardenFeatureCollection = {
    type: 'FeatureCollection';
    features: GeoJSON.Feature[];
  };

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const dispatch = createEventDispatcher();

  let mapReady = false;

  const savedGardenSourceId = 'saved-gardens';
  const gardensAllSourceId = 'gardens-all';
  const savedGardenLayerId = 'saved-gardens-layer';
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
              ? 'tent' // selected garden
              : isSaved
              ? 'tent-saved' // saved garden
              : 'tent-filled', // garden
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
    const gardensClicked = e.features;
    if (!Array.isArray(gardensClicked)) {
      return;
    }
    if (gardensClicked.length > 1) {
      map.flyTo({
        zoom: map.getZoom() + 4,
        center: e.lngLat
      });
    } else {
      const garden = gardensClicked[0]?.properties;
      dispatch('garden-click', garden);
    }
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

      map.addSource(gardensAllSourceId, {
        type: 'geojson',
        data: fcAllGardens,
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
        id: unclusteredPointLayerId,
        type: 'symbol',
        source: gardensAllSourceId,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': {
            stops: [
              [2, 0.05],
              [5, 0.1],
              [6, 0.05],
              [9, 0.07],
              [11, 0.2],
              [12, 0.37],
              [13, 0.4]
            ]
          },
          // Needs to be true, otherwise a city/town name on the map will overlap a garden.
          // http://localhost:5173/explore/garden/XFVhmDog6xQprHRJuy1UkThRUVh2 and the name "Spalbeek"
          // Docs summary: https://stackoverflow.com/a/74657063/4973029
          'icon-allow-overlap': true,
          // These two below allow text (city names etc) to be placed under icons
          'icon-ignore-placement': true,
          'text-optional': false
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

      map.on('click', unclusteredPointLayerId, onGardenClick);
      map.on('click', savedGardenLayerId, onGardenClick);

      [unclusteredPointLayerId, savedGardenLayerId].forEach(addPointerOnHover);
    } catch (err) {
      // should not error in prod
      console.log(err);
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
    map.setLayoutProperty(unclusteredPointLayerId, 'visibility', visible ? 'visible' : 'none');
  };

  const updateSavedGardensVisibility = (visible: boolean) => {
    map.setLayoutProperty(savedGardenLayerId, 'visibility', visible ? 'visible' : 'none');
  };

  // update featurecollections when allGardens or savedGardens change and selectedGardenId
  $: if (mapReady) updateAll(selectedGardenId, savedGardens, allGardens);
  // Update visibility when showGardens or showSavedGardens change
  $: if (mapReady) updateVisibility(showGardens, showSavedGardens);

  setupMarkers();
</script>
