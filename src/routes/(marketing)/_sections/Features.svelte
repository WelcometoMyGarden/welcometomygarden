<script lang="ts">
  import TileList from '../_components/TileList.svelte';
  export let features = [
    {
      icon: '🚆',
      title: 'Trains',
      description: 'With the train layer on, you can easily see the rail network on the map!'
    },
    {
      icon: '📍',
      title: 'Upload your route',
      description: 'Upload your own GPX file and easily find gardens along your route.'
    },
    {
      icon: '🏕',
      title: 'Save gardens',
      description:
        'Keep track of your favourite gardens and in touch with the amazing hosts you’ve met!'
    }
  ];
</script>

<TileList tiles={features} />
