<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$lib/util/navigate';
  import { addGardenLocally } from '$lib/stores/garden';
  import { user } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import { Progress } from '$lib/components/UI';
  import { addGarden } from '$lib/api/garden';
  import Form from '$lib/components/Garden/Form.svelte';
  import routes from '$lib/routes';
  import type { GardenDraft } from '$lib/types/Garden';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import * as Sentry from '@sentry/sveltekit';
  import { lr } from '$lib/util/translation-helpers';
  import logger from '$lib/util/logger';

  let addingGarden = $state(false);

  const submit = async (garden: GardenDraft) => {
    addingGarden = true;
    try {
      const newGarden = await addGarden({
        ...garden,
        photo: garden.photo && garden.photo.files ? garden.photo.files[0] : null
      });
      await addGardenLocally({
        ...newGarden,
        ...(garden.photo?.data ? { localPhotoData: garden.photo.data } : {})
      });
      addingGarden = false;
      trackEvent(PlausibleEvent.ADD_GARDEN);
      let notifyMsg;
      newGarden.photo
        ? (notifyMsg = $_('garden.notify.success'))
        : (notifyMsg = $_('garden.notify.success'));
      notify.success(notifyMsg, 10000);
      goto($lr(`${routes.MAP}/garden/${$user!.id}`));
    } catch (ex) {
      logger.error(ex);
      Sentry.captureException(ex, {
        extra: {
          context: 'Adding garden',
          garden: {
            hasPhoto: !!(garden.photo && garden.photo.files && garden.photo.files[0])
          }
        }
      });
      // TODO: add a user-visible error message?
      addingGarden = false;
    }
  };
</script>

<svelte:head>
  <title>{$_('garden.add.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={addingGarden} />

<Form onsubmit={submit} isSubmitting={addingGarden} />
