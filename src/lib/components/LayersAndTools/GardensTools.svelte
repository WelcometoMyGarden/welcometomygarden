<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { LabeledRadioButton } from '$lib/components/UI';
  import { bookmarkEmptyIcon, hideIcon, tentIcon } from '$lib/images/icons';
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

<LabeledRadioButton
  id="all-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={$_('map.gardens.show-all')}
  value="ALL"
  icon={tentIcon}
/>
<LabeledRadioButton
  id="saved-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={$_('map.gardens.show-saved')}
  value="SAVED"
  icon={bookmarkEmptyIcon}
/>
<LabeledRadioButton
  id="hide-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={$_('map.gardens.hide-all')}
  value="HIDE"
  icon={hideIcon}
/>
