<script>
  import { _ } from 'svelte-i18n';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import notify from '$lib/stores/notification';
  import { confirmPasswordReset, login } from '@/lib/api/auth';
  import { TextInput, Progress, Button } from '$lib/components/UI';
  import { lockIcon } from '$lib/images/icons';
  import routes from '$lib/routes';

  const oobCode = $page.url.searchParams.get('oobCode');

  let password = {};

  let isResetting = false;
  const submit = async () => {
    isResetting = true;
    try {
      await confirmPasswordReset(oobCode, password.value);

      // if password reset was successful, sign user in:
      await login($params.email, password.value);

      notify.success($_('reset-password.succes'));
      goto(routes.MAP);
    } catch (err) {
      console.log(err);
    }
    isResetting = false;
  };
</script>

<Progress active={isResetting} />

<svelte:head>
  <title>{$_('reset-password.title')} | Welcome To My Garden</title>
</svelte:head>

<AuthContainer>
  <span slot="title">{$_('reset-password.title')}</span>

  <form slot="form" on:submit|preventDefault={submit}>
    <label for="password">{$_('generics.password')}</label>
    <TextInput
      icon={lockIcon}
      type="password"
      name="password"
      id="password"
      autocomplete="new-password"
      bind:value={password.value}
    />

    <Button type="submit" medium>{$_('reset-password.update')}</Button>
  </form>
</AuthContainer>

<style>
  label,
  button {
    display: block;
  }
</style>
