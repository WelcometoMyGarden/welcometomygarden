<script>
  import { _ } from 'svelte-i18n';
  import { goto, params } from '@roxi/routify';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import notify from '@/stores/notification';
  import { confirmPasswordReset, login } from '@/api/auth';
  import { TextInput, Progress, Button } from '@/components/UI';
  import { lockIcon } from '@/images/icons';
  import routes from '@/routes';

  let password = {};

  let isResetting = false;
  const submit = async () => {
    isResetting = true;
    try {
      await confirmPasswordReset($params.oobCode, password.value);

      // if password reset was successful, sign user in:
      await login($params.email, password.value);

      notify.success($_('reset-password.succes'));
      $goto(routes.MAP);
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
