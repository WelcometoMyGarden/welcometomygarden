<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { LabeledCheckbox } from '$lib/components/UI';
  import { flagIcon, trainIcon } from '$lib/images/icons';

  export let showTransport: boolean;
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
