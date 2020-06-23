<script>
  import { redirect } from '@sveltech/routify';
  import { updateGardenLocally } from '@/stores/garden';
  import { user } from '@/stores/auth';
  import notify from '@/stores/notification';
  import { Progress } from '@/components/UI';
  import { updateGarden } from '@/api/garden';
  import Form from '@/components/Garden/Form.svelte';
  import routes from '@/routes';

  if (!$user || !$user.garden) $redirect(routes.ACCOUNT);

  let updatingGarden = false;

  const submit = async e => {
    const garden = e.detail;
    updatingGarden = true;
    try {
      const newGarden = await updateGarden({
        ...garden,
        photo: garden.photo && garden.photo.files ? garden.photo.files[0] : null
      });
      updateGardenLocally(newGarden);
      notify.success(
        `Your garden was updated successfully!  ${
          newGarden.photo ? 'It may take a minute for its photo to show up.' : ''
        }`,
        10000
      );
      $redirect(`${routes.MAP}/garden/${$user.id}`);
    } catch (ex) {
      console.log(ex);
    }
    updatingGarden = false;
  };
</script>

<Progress active={updatingGarden} />

<Form on:submit={submit} isUpdate isSubmitting={updatingGarden} garden={$user.garden} />
