<script lang="ts">
  import TileList from '../_components/TileList.svelte';
  import { _ } from 'svelte-i18n';
  export let backgroundColor: string | undefined = undefined;

  type Feature = {
    icon: string;
    description?: string;
    title?: string;
    largeDescription?: true;
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
      title: $_('superfan-shared.three-features.feature-three-title'),
      description: $_('superfan-shared.three-features.feature-three-description')
    }
  ];
</script>

<TileList
  tiles={(features || defaultFeatures).map((f, i) => ({
    ...f,
    backgroundColor,
    label: `${$_('generics.feature')} ${i + 1}`
  }))}
/>
