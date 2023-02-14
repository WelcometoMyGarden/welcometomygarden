<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { goto } from '$lib/util/navigate';
  import notify from '$lib/stores/notification';
  import { updateMailPreferences } from '@/lib/api/user';
  import { resendAccountVerification } from '@/lib/api/auth';
  import { changeListedStatus } from '$lib/api/garden';
  import { user } from '@/lib/stores/auth';
  import { updatingMailPreferences } from '$lib/stores/user';
  import { Avatar, Icon, Button, LabeledCheckbox } from '$lib/components/UI';
  import { flagIcon, emailIcon } from '$lib/images/icons';
  import { countries } from '$lib/util';
  import routes from '@/lib/routes';
  import { SUPPORT_EMAIL } from '$lib/constants';
  import { createCustomerPortalSession } from '@/lib/api/functions';
  import ReloadSuggestion from '@/lib/components/ReloadSuggestion.svelte';

  if (!$user) {
    goto(routes.SIGN_IN);
  }

  const onMailPreferenceChanged = async (event) => {
    try {
      const { name, checked } = event.target;
      await updateMailPreferences(name, checked);
      notify.success($_('account.notify.preferences-update'), 3500);
    } catch (ex) {
      console.log(ex);
    }
  };

  let updatingListedStatus = false;
  const changeGardenListed = async (event) => {
    const newStatus = event.target.checked;
    updatingListedStatus = true;
    try {
      await changeListedStatus(newStatus);
      if (!newStatus) notify.success($_('account.notify.garden-no-show'), 7000);
      else notify.success($_('account.notify.garden-show'), 7000);
    } catch (ex) {
      console.log(ex);
    }
    updatingListedStatus = false;
  };

  let isResendingEmail: boolean;
  let hasResentEmail = false;
  const doResendEmail = async () => {
    try {
      isResendingEmail = true;
      await resendAccountVerification();
      hasResentEmail = true;
      isResendingEmail = false;
    } catch (ex) {
      console.log(ex);
      if (!ex.code) notify.danger(ex, 15000);
      else
        notify.danger(
          $_('account.notify.resend-error', { values: { support: SUPPORT_EMAIL } }),
          12000
        );
      isResendingEmail = false;
      hasResentEmail = false;
    }
  };

  let loadingPortal = false;
  const openCustomerPortalSession = async () => {
    loadingPortal = true;
    try {
      const { data } = await createCustomerPortalSession();
      const { url } = data;
      window.open(url, '_blank');
    } finally {
      loadingPortal = false;
    }
  };
</script>

<svelte:head>
  <title>{$_('account.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

{#if $user}
  <div class="wrapper">
    <div class="avatar">
      <Avatar large name={$user.firstName} border={!!$user.superfan} />
    </div>
    <div class="content">
      <section class="user-information">
        <h2>{$user.firstName} {$user.lastName}</h2>
        <div class="details">
          <div>
            <span class="icon">
              <Icon icon={emailIcon} />
            </span>
            {$user.email}
          </div>
          <div>
            <span class="icon">
              <Icon icon={flagIcon} />
            </span>
            {countries[$user.countryCode]}
          </div>
        </div>
      </section>
      {#if !$user.emailVerified}
        <section>
          <h2>{$_('account.verify.title')}</h2>
          <div>
            <p>{$_('account.verify.text')}</p>
            {#if !hasResentEmail}
              <div class="resend-verification">
                <Button uppercase xsmall disabled={isResendingEmail} on:click={doResendEmail}>
                  {$_('account.verify.button')}
                </Button>
              </div>
            {:else}
              <p class="resend-verification">{$_('account.verify.sent')}</p>
            {/if}
            <ReloadSuggestion />
          </div>
        </section>
      {/if}
      <section>
        <h2>{$_('account.preferences.title')}</h2>
        <p>{$_('account.preferences.text')}</p>
        <ul class="preference-list">
          <li>
            <input
              disabled={$updatingMailPreferences}
              type="checkbox"
              id="new-chat"
              name="newChat"
              checked={$user.emailPreferences.newChat}
              on:change={onMailPreferenceChanged}
            />
            <label for="new-chat">{$_('account.preferences.chat')}</label>
          </li>
          <li>
            <input
              disabled={$updatingMailPreferences}
              type="checkbox"
              id="news"
              name="news"
              checked={$user.emailPreferences.news}
              on:change={onMailPreferenceChanged}
            />
            <label for="news">{$_('account.preferences.news')}</label>
          </li>
        </ul>
      </section>
      <section>
        <h2>{$_('account.garden.title')}</h2>
        {#if !$user.garden}
          <p class="description">{$_('account.garden.unlisted.text')}</p>
          <Button uppercase medium href={routes.ADD_GARDEN}>
            {$_('account.garden.unlisted.button')}
          </Button>
        {:else if $user.emailVerified && $user.garden}
          <p class="mb-m">{$_('account.garden.listed.text')}</p>
          <LabeledCheckbox
            disabled={updatingListedStatus}
            name="listed"
            checked={$user.garden.listed}
            label="Shown on the map"
            on:input={changeGardenListed}
          />
          <div class="mt-m">
            <Button href={routes.MANAGE_GARDEN} medium uppercase>
              {$_('account.garden.listed.button')}
            </Button>
          </div>
        {:else if $user.garden && !$user.emailVerified}
          <p class="mb-m">{$_('account.garden.unverified.text')}</p>
        {/if}
      </section>
      {#if $user.superfan === true}
        <section>
          <h2>{$_('account.superfan.title')}</h2>
          <Button uppercase medium on:click={openCustomerPortalSession}
            >{$_('account.superfan.manage-button')}</Button
          >
          {#if loadingPortal}
            <div class="loading">{$_('account.superfan.loading-portal')}</div>
          {/if}
        </section>
      {/if}
    </div>
  </div>
{/if}

<style>
  .wrapper {
    background-color: var(--color-white);
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    padding-top: 8rem;
    padding-bottom: 4rem;
    width: 100%;
    min-height: calc(calc(var(--vh, 1vh) * 100) - var(--height-footer) - var(--height-nav) - 14rem);
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

  .content {
    max-width: 60rem;
    width: 100%;
    margin: 0 auto;
    padding: 0 3rem;
  }

  section {
    margin-bottom: 4rem;
  }

  .user-information {
    text-align: center;
    padding-bottom: 2rem;
    border-bottom: 2px solid var(--color-gray);
    margin-bottom: 2rem;
  }

  .user-information .details {
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    margin-top: 2rem;
  }

  .user-information .details > div {
    display: flex;
    align-items: center;
  }

  .icon {
    width: 2rem;
    height: 1.5rem;
    display: inline-block;
    margin-right: 0.8rem;
  }

  .preference-list {
    padding-left: 4rem;
    margin: 1rem 0;
  }

  .preference-list li {
    display: flex;
    align-items: flex-start;
    margin-bottom: 0.4rem;
  }

  .preference-list label {
    margin-left: 1rem;
  }

  h2 {
    margin-bottom: 2rem;
    font-weight: 500;
    font-size: 1.8rem;
  }

  @media (max-width: 700px) {
    .wrapper {
      min-height: calc(calc(var(--vh, 1vh) * 100) - var(--height-nav) - 12rem);
      margin-bottom: 0;
    }
    .preference-list {
      padding-left: 2rem;
    }
  }

  @media (max-width: 550px) {
    .user-information .details {
      flex-direction: column;
    }
    .user-information .details > div {
      margin-bottom: 1rem;
    }
  }

  .description {
    margin-bottom: 1rem;
  }

  .resend-verification {
    margin-top: 1rem;
    display: block;
  }
</style>
