<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$lib/util/navigate';
  import { updateGardenLocally } from '$lib/stores/garden';
  import { user } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import { Progress } from '$lib/components/UI';
  import { updateGarden } from '$lib/api/garden';
  import Form from '$lib/components/Garden/Form.svelte';
  import routes from '$lib/routes';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import type { GardenDraft } from '$lib/types/Garden';
  import * as Sentry from '@sentry/sveltekit';
  import { lr } from '$lib/util/translation-helpers';

  let updatingGarden = false;

  const submit = async (e: CustomEvent<GardenDraft>) => {
    const garden = e.detail;
    updatingGarden = true;

    try {
      const newGarden = await updateGarden({
        ...garden,
        // In case the garden already had a photo before the update, garden.photo.files will be undefined
        // Because they didn't upload a new one; thus, photo here will be null.
        photo: garden.photo && garden.photo.files ? garden.photo.files[0] : null
      });
      updatingGarden = false;
      await updateGardenLocally({
        ...newGarden,
        ...(garden.photo?.data ? { localPhotoData: garden.photo.data } : {})
      });

      let notifyMsg;
      newGarden.photo
        ? (notifyMsg = $_('garden.notify.update'))
        : (notifyMsg = $_('garden.notify.update'));
      notify.success(notifyMsg, 10000);
      trackEvent(PlausibleEvent.UPDATE_GARDEN);
      goto($lr(`${routes.MAP}/garden/${$user!.id}`));
    } catch (ex) {
      console.log(ex);
      Sentry.captureException(ex, {
        extra: {
          context: 'Error managing garden',
          garden: {
            hasPhoto: !!(garden.photo && garden.photo.files && garden.photo.files[0])
          }
        }
      });
      updatingGarden = false;
    }
  };
</script>

<svelte:head>
  <title>{$_('garden.manage.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={updatingGarden} />

{#if $user?.garden}
  <Form on:submit={submit} isUpdate isSubmitting={updatingGarden} />
{/if}
