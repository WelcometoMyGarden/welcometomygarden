<script>
  export let allGardens;
  export let selectedGardenId;

  import { getContext, createEventDispatcher } from 'svelte';
  import key from './mapbox-context.js';

  const { getMap } = getContext(key);
  const map = getMap();

  const dispatch = createEventDispatcher();

  const doAddGeojson = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: Object.keys(allGardens).map(gardenId => {
        const garden = allGardens[gardenId];
        return {
          type: 'Feature',
          properties: {
            id: gardenId,
            ...garden,
            lnglat: [garden.location.longitude, garden.location.latitude]
          },
          geometry: {
            type: 'Point',
            coordinates: [garden.location.longitude, garden.location.latitude]
          }
        };
      })
    };

    map.addSource('gardens', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: 9,
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
        'text-font': ['Montserrat', 'Arial'],
        'text-size': 13
      },
      paint: {
        'text-color': '#fff'
      }
    });

    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'gardens',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    // inspect a cluster on click
    map.on('click', 'clusters', e => {
      var features = map.queryRenderedFeatures(e.point, {
        layers: ['clusters']
      });
      var clusterId = features[0].properties.cluster_id;
      map.getSource('gardens').getClusterExpansionZoom(clusterId, function(err, zoom) {
        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom
        });
      });
    });

    map.on('click', 'unclustered-point', e => {
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
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = '';
    });
  };

  $: if (map && allGardens) {
    map.on('load', doAddGeojson);
  }
</script>

<style>
  .marker {
    background-image: url('/images/icons/tent.svg');
    background-size: 3.5rem auto;
    background-repeat: no-repeat;
    background-position: center center;
    background-color: var(--color-white);
    box-shadow: 0px 0px 2rem rgba(0, 0, 0, 0.1);
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 300ms ease;
  }

  :global(.marker.selected) {
    background-image: url('/images/icons/tent-white.svg');
    background-color: var(--color-green);
    z-index: 100;
  }
</style>
