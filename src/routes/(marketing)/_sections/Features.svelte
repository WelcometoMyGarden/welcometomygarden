<script lang="ts">
  import TileList from '../_components/TileList.svelte';
  import { _ } from 'svelte-i18n';

  type Feature = {
    icon: string;
    title: string;
    description: string;
  };

  // Optional param features override
  export let features: Feature[] | undefined = undefined;

  let defaultFeatures: Feature[];
  $: defaultFeatures = [
    {
      icon: '🚆',
      title: $_('superfan-shared.three-features.feature-one-title'),
      description: $_('superfan-shared.three-features.feature-one-description')
    },
    {
      icon: '📍',
      title: $_('superfan-shared.three-features.feature-two-title'),
      description: $_('superfan-shared.three-features.feature-two-description')
    },
    {
      icon: '🏕',
      title: $_('superfan-shared.three-features.feature-two-title'),
      description: $_('superfan-shared.three-features.feature-three-description')
    }
  ];
</script>

<TileList tiles={features || defaultFeatures} />
