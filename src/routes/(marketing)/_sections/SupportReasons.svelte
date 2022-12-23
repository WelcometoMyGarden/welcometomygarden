<script lang="ts">
  import { onDestroy } from 'svelte';
  import { _ } from 'svelte-i18n';
  import TileList from '../_components/TileList.svelte';

  type SupportReason = {
    icon: string;
    title: string;
    description: string;
  };

  const contentOf = (prefix: string) => ({
    title: $_(prefix + '-title'),
    description: $_(prefix + '-description')
  });

  let supportReasons: SupportReason[];

  const setSupportReasons = () =>
    (supportReasons = [
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
    ]);
  setSupportReasons();

  const unsubscribeLocalization = _.subscribe(() => {
    setSupportReasons();
  });
  onDestroy(() => {
    unsubscribeLocalization();
  });
</script>

<TileList tiles={supportReasons} />
