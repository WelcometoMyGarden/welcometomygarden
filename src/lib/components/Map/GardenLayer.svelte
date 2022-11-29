<script lang="ts">
  export let allGardens;
  export let selectedGardenId;

  import { getContext, createEventDispatcher, onMount, onDestroy } from 'svelte';
  import key from './mapbox-context.js';

  const { getMap } = getContext(key);
  const map = getMap();

  const dispatch = createEventDispatcher();

  let mapReady = false;

  const getData = () => ({
    type: 'FeatureCollection',
    features: Object.keys(allGardens).map((gardenId) => {
      const garden = allGardens[gardenId];
      return {
        type: 'Feature',
        properties: {
          id: gardenId,
          ...garden,
          lnglat: [garden.location.longitude, garden.location.latitude],
          icon: selectedGardenId === gardenId ? 'tent-filled' : 'tent'
        },
        geometry: {
          type: 'Point',
          coordinates: [garden.location.longitude, garden.location.latitude]
        }
      };
    })
  });

  const setupMarkers = async () => {
    // Catch all errors to avoid having to reload when working on this component in development
    try {
      const images = [
        { url: '/images/markers/tent-neutral.png', id: 'tent' },
        { url: '/images/markers/tent-filled.png', id: 'tent-filled' }
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
      const data = getData();

      map.addSource('gardens', {
        type: 'geojson',
        data: data,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'gardens',
        filter: ['has', 'point_count'],
        paint: {
          // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step
          //   * Blue, 20px circles when point count is less than 20
          //   * Yellow, 30px circles when point count is between 30 and 40
          //   * Pink, 40px circles when point count is greater than or equal to 40
          'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 20, '#f1f075', 40, '#f28cb1'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 20, 30, 40, 40]
        }
      });

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'gardens',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 13
        }
      });

      map.addLayer({
        id: 'unclustered-point',
        type: 'symbol',
        source: 'gardens',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.4
        }
      });

      // inspect a cluster on click
      map.on('click', 'clusters', (e) => {
        var features = map.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        var clusterId = features[0].properties.cluster_id;
        map.getSource('gardens').getClusterExpansionZoom(clusterId, function (err, zoom) {
          if (err) return;

          map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          });
        });
      });

      map.on('click', 'unclustered-point', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const garden = e.features[0].properties;

        // Ensure that if the map is zoomed out such that
        // multiple copies of the feature are visible, the
        // popup appears over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        dispatch('garden-click', garden);
      });

      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseenter', 'unclustered-point', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
      });
    } catch (err) {
      // should not error in prod
      console.log(err);
    } finally {
      mapReady = true;
    }
  };

  const updateSelectedMarker = () => {
    const data = getData();
    map.getSource('gardens').setData(data);
  };

  $: if (mapReady) updateSelectedMarker(selectedGardenId, allGardens);

  setupMarkers();
</script>
