<script>
  import { _ } from 'svelte-i18n';
  import { user } from '@/lib/stores/auth';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import routes from '$lib/routes';
  import notify from '$lib/stores/notification';
  import { verifyPasswordResetCode, applyActionCode } from '@/lib/api/auth';

  const mode = $page.url.searchParams.get('mode');
  // https://firebase.google.com/docs/auth/custom-email-handler
  // oobCode = "A one-time code, used to identify and verify a request"
  const oobCode = $page.url.searchParams.get('oobCode');

  if (!mode || !oobCode) {
    notify.danger($_('auth.invalid-code'));
    goto(routes.HOME);
  }

  const handleAction = async () => {
    if (!mode || !oobCode) {
      throw new Error('Invalid code');
    }
    if (mode === 'resetPassword') {
      try {
        const email = await verifyPasswordResetCode(oobCode);
        let query = new URLSearchParams();
        query.set('mode', mode);
        query.set('oobCode', oobCode);
        query.set('email', email);
        goto(routes.RESET_PASSWORD + `?${query.toString()}`);
      } catch (ex) {
        notify.danger($_('auth.password.expired'), 15000);
        goto(routes.REQUEST_PASSWORD_RESET);
      }
    }

    if (mode === 'verifyEmail') {
      try {
        await applyActionCode(oobCode);
        notify.success($_('auth.verification.succes'), 8000);
        return goto(routes.MAP);
      } catch (ex) {
        if ($user && $user.emailVerified) {
          notify.success($_('auth.verification.refresh'), 12000);
          return goto(routes.ACCOUNT);
        } else {
          console.error(ex);
          notify.danger($_('auth.verification.expired'), 15000);
          return goto(routes.ACCOUNT);
        }
      }
    }
  };

  handleAction();
</script>
