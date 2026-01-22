<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { LabeledRadioButton } from '$lib/components/UI';
  import { heartIcon, hideIcon, tentPhosphor } from '$lib/images/icons';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  interface Props {
    showGardens: boolean;
    showSavedGardens: boolean;
  }

  let { showGardens = $bindable(), showSavedGardens = $bindable() }: Props = $props();

  type VisibilityStates = 'ALL' | 'SAVED' | 'HIDE';

  // Initialize from the bindable properties
  let gardensGroup: VisibilityStates = $state(
    showGardens ? 'ALL' : showSavedGardens ? 'SAVED' : 'HIDE'
  );
  let previousGardensGroup: VisibilityStates = $state(gardensGroup);

  $effect(() => {
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
  });
</script>

<LabeledRadioButton
  id="all-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={$_('map.gardens.show-all')}
  value="ALL"
  icon={tentPhosphor}
/>
<LabeledRadioButton
  id="saved-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={$_('map.gardens.show-saved')}
  value="SAVED"
  icon={heartIcon}
/>
<LabeledRadioButton
  id="hide-gardens"
  name="gardens"
  bind:group={gardensGroup}
  label={$_('map.gardens.hide-all')}
  value="HIDE"
  icon={hideIcon}
/>
