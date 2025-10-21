<script lang="ts">
  import { activeRootPath } from '$lib/routes';
  import { transKeyExists } from '$lib/util';
  import { t } from 'svelte-i18n';

  export let name: string | undefined = undefined;
  export let property: string | undefined = undefined;
  export let fallbackContent: string | undefined = undefined;
  export let pageKey: string | undefined = undefined;
  export let itemKey: string | undefined = undefined;

  $: fPageKey = pageKey ?? $activeRootPath;
  $: fItemKey = itemKey ?? name ?? property ?? '';
</script>

<!-- @component requires localization to be loaded -->

<meta
  {name}
  {property}
  content={transKeyExists(`seo.${fPageKey}.${fItemKey}`)
    ? $t(`seo.${fPageKey}.${fItemKey}`)
    : fallbackContent}
/>
