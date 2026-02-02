<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { LabeledCheckbox } from '$lib/components/UI';
  import { flagIcon, trainIcon } from '$lib/images/icons';

  interface Props {
    showTransport: boolean;
  }

  let { showTransport = $bindable() }: Props = $props();
</script>

<LabeledCheckbox
  name="transport"
  icon={trainIcon}
  label={$_('map.railway.show-transport')}
  bind:checked={showTransport}
/>

<div class="hide">
  <LabeledCheckbox name="rails" icon={flagIcon} label={'Railway track'} />
</div>
