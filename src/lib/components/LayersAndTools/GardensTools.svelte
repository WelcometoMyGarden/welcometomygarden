<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { LabeledRadiobox } from '@/lib/components/UI';
  export let showGardens: boolean;
  export let showSavedGardens: boolean;
  let gardensGroup: 'ALL' | 'SAVED' | 'HIDE' = 'ALL';

  $: {
    switch (gardensGroup) {
      case 'ALL':
        showGardens = true;
        showSavedGardens = false;
        break;
      case 'SAVED':
        showGardens = false;
        showSavedGardens = true;
        break;
      case 'HIDE':
        showGardens = false;
        showSavedGardens = false;
        break;
      default:
        break;
    }
  }
</script>

<LabeledRadiobox
  id="all-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={$_('map.gardens.show-all')}
  value="ALL"
/>
<LabeledRadiobox
  id="saved-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={$_('map.gardens.show-saved')}
  value="SAVED"
/>
<LabeledRadiobox
  id="hide-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={$_('map.gardens.hide-all')}
  value="HIDE"
/>
