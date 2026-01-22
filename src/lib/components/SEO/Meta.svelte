<script lang="ts">
  import { activeRootPath } from '$lib/routes';
  import { transKeyExists } from '$lib/util';
  import { t } from 'svelte-i18n';

  interface Props {
    name?: string | undefined;
    property?: string | undefined;
    fallbackContent?: string | undefined;
    pageKey?: string | undefined;
    itemKey?: string | undefined;
  }

  let {
    name = undefined,
    property = undefined,
    fallbackContent = undefined,
    pageKey = undefined,
    itemKey = undefined
  }: Props = $props();

  let fPageKey = $derived(pageKey ?? $activeRootPath);
  let fItemKey = $derived(itemKey ?? name ?? property ?? '');
</script>

<!-- @component requires localization to be loaded -->

<meta
  {name}
  {property}
  content={transKeyExists(`seo.${fPageKey}.${fItemKey}`)
    ? $t(`seo.${fPageKey}.${fItemKey}`)
    : fallbackContent}
/>
