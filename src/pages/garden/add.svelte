<script>
  import { redirect } from '@sveltech/routify';
  import { addGardenLocally } from '@/stores/garden';
  import { user } from '@/stores/auth';
  import notify from '@/stores/notification';
  import { Progress } from '@/components/UI';
  import { addGarden } from '@/api/garden';
  import Form from '@/components/Garden/Form.svelte';
  import routes from '@/routes';

  if ($user && $user.garden) $redirect(routes.MANAGE_GARDEN);

  let addingGarden = false;

  const submit = async e => {
    const garden = e.detail;
    addingGarden = true;
    try {
      const newGarden = await addGarden({
        ...garden,
        photo: garden.photo.files ? garden.photo.files[0] : null
      });
      addGardenLocally(newGarden);
      notify.success(`Your garden was added successfully!`, 10000);
      $redirect(`${routes.MAP}/garden/${$user.id}`);
    } catch (ex) {
      console.log(ex);
    }
    addingGarden = false;
  };

  const initialGarden = {
    description: '',
    location: null,
    facilities: {
      capacity: 1
    },
    photo: {
      files: null,
      data: null
    }
  };
</script>

<Progress active={addingGarden} />

<Form on:submit={submit} garden={initialGarden} />
