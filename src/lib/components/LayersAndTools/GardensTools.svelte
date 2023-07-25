<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { LabeledRadioButton } from '$lib/components/UI';
  import { bookmarkEmptyIcon, hideIcon, tentIcon } from '$lib/images/icons';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  export let showGardens: boolean;
  export let showSavedGardens: boolean;
  type VisibilityStates = 'ALL' | 'SAVED' | 'HIDE';
  let gardensGroup: VisibilityStates = 'ALL';
  let previousGardensGroup: VisibilityStates = gardensGroup;

  $: {
    if (previousGardensGroup !== gardensGroup) {
      // Remember the last event that was clicked
      trackEvent(
        PlausibleEvent.SET_GARDEN_VISIBILITY,
        {
          type: ({ ALL: 'show_all', SAVED: 'show_saved', HIDE: 'hide_all' } as const)[gardensGroup]
        },
        true
      );
    }
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
    previousGardensGroup = gardensGroup;
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
