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

  let addingGarden = false;

  const submit = async (e: CustomEvent<GardenDraft>) => {
    const garden = e.detail;
    addingGarden = true;
    try {
      const newGarden = await addGarden({
        ...garden,
        photo: garden.photo && garden.photo.files ? garden.photo.files[0] : null
      });
      await addGardenLocally(newGarden);
      addingGarden = false;
      trackEvent(PlausibleEvent.ADD_GARDEN);
      let notifyMsg;
      newGarden.photo
        ? (notifyMsg = $_('garden.notify.success') + ' ' + $_('garden.notify.photo'))
        : (notifyMsg = $_('garden.notify.success'));
      notify.success(notifyMsg, 10000);
      goto(`${routes.MAP}/garden/${$user!.id}`);
    } catch (ex) {
      console.log(ex);
      addingGarden = false;
    }
  };
</script>

<svelte:head>
  <title>{$_('garden.add.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={addingGarden} />

<Form on:submit={submit} isSubmitting={addingGarden} />
