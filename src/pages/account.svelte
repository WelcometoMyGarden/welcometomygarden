<script>
  import { fade } from 'svelte/transition';
  import { goto } from '@sveltech/routify';
  import notify from '@/stores/notification';
  import { getPrivateUserProfile, updateMailPreferences } from '@/api/user';
  import { resendAccountVerification } from '@/api/auth';
  import { user } from '@/stores/auth';
  import { gettingPrivateUserProfile, updatingMailPreferences } from '@/stores/user';
  import { Progress, Avatar } from '@/components/UI';
  import routes from '@/routes';

  const onMailPreferenceChanged = async event => {
    try {
      const { name, checked } = event.target;
      await updateMailPreferences(name, checked);
      $user.emailPreferences[name] = checked;
      notify.success('Your email preferences have been updated!', 3500);
    } catch (ex) {
      console.log(ex);
    }
  };

  getPrivateUserProfile().catch(() => {
    notify.danger(
      "We couldn't get your profile information. Please contact support@welcometomygarden.be",
      15000
    );
    $goto(routes.HOME);
  });

  let isResendingEmail;
  let hasResentEmail = false;
  const doResendEmail = async () => {
    try {
      isResendingEmail = true;
      await resendAccountVerification();
      hasResentEmail = true;
      isResendingEmail = false;
    } catch (ex) {
      console.log(ex);
      notify.danger(
        "We couldn't resend an account verification email. Please contact support@welcometomygarden.be"
      );
      isResendingEmail = false;
      hasResentEmail = false;
    }
  };
</script>

<Progress active={$gettingPrivateUserProfile} />
{#if !$gettingPrivateUserProfile}
  <div class="wrapper">
    <div class="avatar">
      <Avatar large name={$user.firstName} />
    </div>
    <section>
      {#if !$user.emailVerified}
        <div>
          You need to verify your email address if you want to chat or add a garden.
          {#if !hasResentEmail}
            <button transition:fade disabled={isResendingEmail} on:click={doResendEmail}>
              Resend email
            </button>
          {:else}
            <p>Email sent!</p>
          {/if}
        </div>
      {/if}
      <div>
        <h2>Email preferences</h2>
        Send me emails when:
        <ul class="preference-list">
          <li>
            <input
              disabled={$updatingMailPreferences}
              type="checkbox"
              id="new-chat"
              name="newChat"
              checked={$user.emailPreferences.newChat}
              on:change={onMailPreferenceChanged} />
            <label for="new-chat">I receive a new chat message</label>
          </li>
          <li>
            <input
              disabled={$updatingMailPreferences}
              type="checkbox"
              id="news"
              name="news"
              checked={$user.emailPreferences.news}
              on:change={onMailPreferenceChanged} />
            <label for="news">Welcome To My Garden has news to share</label>
          </li>
        </ul>
      </div>
    </section>
  </div>

{/if}

<style>
  .wrapper {
    background-color: var(--color-white);
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    padding-top: 8rem;
    padding-bottom: 4rem;
    width: 100%;
    min-height: calc(100vh - var(--height-footer) - var(--height-nav) - 14rem);
    margin-top: 10rem;
    position: relative;
    margin-bottom: 4rem;
  }

  .avatar {
    position: absolute;
    left: calc(50% - 5rem);
    top: -5rem;
    z-index: 10;
  }

  section {
    max-width: 60rem;
    width: 100%;
    margin: 0 auto;
    padding: 0 3rem;
  }

  .preference-list {
    padding-left: 4rem;
    margin: 1rem 0;
  }

  .preference-list li {
    display: flex;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .preference-list label {
    margin-left: 1rem;
  }

  h2 {
    margin-bottom: 2rem;
    font-weight: 900;
    font-size: 1.8rem;
  }

  @media (max-width: 850px) {
    .wrapper {
      min-height: calc(100vh - var(--height-footer) - var(--height-nav) - 12rem);
      margin-top: 8rem;
    }
  }

  @media (max-width: 700px) {
    .wrapper {
      min-height: calc(100vh - var(--height-nav));
      margin-top: 0;
    }
  }
</style>
