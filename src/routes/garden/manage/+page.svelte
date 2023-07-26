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
  import { checkAndHandleUnverified } from '$lib/api/auth';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';

  if (!$user) {
    notify.info($_('auth.unsigned'), 8000);
    goto(routes.SIGN_IN);
  } else if (!$user.emailVerified) {
    checkAndHandleUnverified($_('auth.verification.unverified'), 8000);
  } else if (!$user.garden) {
    notify.warning($_('garden.manage.add-first'));
    goto(routes.ADD_GARDEN);
  }
  let updatingGarden = false;

  const submit = async (e) => {
    const garden = e.detail;
    updatingGarden = true;
    try {
      const newGarden = await updateGarden({
        ...garden,
        photo: garden.photo && garden.photo.files ? garden.photo.files[0] : null
      });
      updatingGarden = false;
      await updateGardenLocally(newGarden);

      let notifyMsg;
      newGarden.photo
        ? (notifyMsg = $_('garden.notify.update') + ' ' + $_('garden.notify.photo'))
        : (notifyMsg = $_('garden.notify.update'));
      notify.success(notifyMsg, 10000);
      trackEvent(PlausibleEvent.UPDATE_GARDEN);
      goto(`${routes.MAP}/garden/${$user.id}`);
    } catch (ex) {
      console.log(ex);
      updatingGarden = false;
    }
  };
</script>

<svelte:head>
  <title>{$_('garden.manage.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={updatingGarden} />

{#if $user && $user.garden}
  <Form on:submit={submit} isUpdate isSubmitting={updatingGarden} garden={$user.garden} />
{/if}
