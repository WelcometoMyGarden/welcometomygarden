<script>
  import { goto, params } from '@sveltech/routify';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import notify from '@/stores/notification';
  import { confirmPasswordReset, login } from '@/api/auth';
  import { TextInput, Progress } from '@/components/UI';
  import { lockIcon } from '@/images/icons';
  import routes from '@/routes';

  let password = {};

  let isResetting = false;
  const submit = async () => {
    isResetting = true;
    try {
      console.log(password);
      await confirmPasswordReset($params.oobCode, password.value);

      // if password reset was successful, sign user in:
      await login($params.email, password.value);

      notify.success('Your password was reset succesfully');
      $goto(routes.MAP);
    } catch (err) {
      console.log(err);
    }
    isResetting = false;
  };
</script>

<Progress active={isResetting} />

<svelte:head>
  <title>Set a new password | Welcome to my Garden</title>
</svelte:head>

<AuthContainer>
  <span slot="title">Set a new password</span>

  <form slot="form" on:submit|preventDefault={submit}>
    <label for="password">Password</label>
    <TextInput
      icon={lockIcon}
      type="password"
      name="password"
      id="password"
      autocomplete="new-password"
      bind:value={password.value} />

    <button type="submit">Update password</button>
  </form>
</AuthContainer>

<style>
  label,
  button {
    display: block;
  }
</style>
