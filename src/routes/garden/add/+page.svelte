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
  import type { Garden } from '$lib/types/Garden';

  if ($user && $user.garden) goto(routes.MANAGE_GARDEN);

  let addingGarden = false;

  const submit = async (e) => {
    const garden = e.detail;
    addingGarden = true;
    try {
      const newGarden = await addGarden({
        ...garden,
        photo: garden.photo && garden.photo.files ? garden.photo.files[0] : null
      });
      await addGardenLocally(newGarden);
      addingGarden = false;
      let notifyMsg;
      newGarden.photo
        ? (notifyMsg = $_('garden.notify.success') + ' ' + $_('garden.notify.photo'))
        : (notifyMsg = $_('garden.notify.success'));
      notify.success(notifyMsg, 10000);
      goto(`${routes.MAP}/garden/${$user.id}`);
    } catch (ex) {
      console.log(ex);
      addingGarden = false;
    }
  };

  const initialGarden: Garden = {
    description: '',
    location: null,
    facilities: {
      capacity: 1
    },
    photo: {
      files: null,
      data: null
    },
    listed: true
  };
</script>

<svelte:head>
  <title>{$_('garden.add.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={addingGarden} />

<Form on:submit={submit} isSubmitting={addingGarden} garden={initialGarden} />
