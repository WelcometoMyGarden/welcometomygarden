<script lang="ts">
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
  label={'Show all gardens'}
  value="ALL"
/>
<LabeledRadiobox
  id="saved-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={'Only saved gardens'}
  value="SAVED"
/>
<LabeledRadiobox
  id="hide-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={'Hide all gardens'}
  value="HIDE"
/>
