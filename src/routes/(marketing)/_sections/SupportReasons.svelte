<script lang="ts">
  import { _ } from 'svelte-i18n';
  import TileList from '../_components/TileList.svelte';

  type SupportReason = {
    icon: string;
    title: string;
    description: string;
  };

  // This might not be totally valid svelte, but it seems to work
  const contentOf = (prefix: string) => ({
    title: $_(prefix + '-title'),
    description: $_(prefix + '-description')
  });

  let supportReasons: SupportReason[];

  $: supportReasons = [
    {
      icon: '💚',
      ...contentOf('superfan-shared.three-support-reasons.support-one')
    },
    {
      icon: '🤩',
      ...contentOf('superfan-shared.three-support-reasons.support-two')
    },
    {
      icon: '👋',
      ...contentOf('superfan-shared.three-support-reasons.support-three')
    }
  ];
</script>

<TileList tiles={supportReasons} />
