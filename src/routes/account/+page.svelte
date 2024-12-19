<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { goto } from '$lib/util/navigate';
  import notify from '$lib/stores/notification';
  import { updateMailPreferences } from '$lib/api/user';
  import { resendAccountVerification } from '$lib/api/auth';
  import { changeListedStatus } from '$lib/api/garden';
  import { user } from '$lib/stores/auth';
  import { updatingMailPreferences } from '$lib/stores/user';
  import { Avatar, Icon, Button, LabeledCheckbox } from '$lib/components/UI';
  import AccountDeletionModal from './AccountDeletionModal.svelte';
  import { flagIcon, emailIcon, pencilIcon } from '$lib/images/icons';
  import routes from '$lib/routes';
  import { SUPPORT_EMAIL } from '$lib/constants';
  import ReloadSuggestion from '$lib/components/ReloadSuggestion.svelte';
  import EmailChangeModal from './EmailChangeModal.svelte';
  import { countryNames } from '$lib/stores/countryNames';
  import NotificationSection from './NotificationSection.svelte';
  import {
    hasAutoRenewingSubscription,
    hasOpenRenewalInvoice,
    hasValidSubscription,
    shouldPromptForNewSubscription
  } from '$lib/stores/subscription';
  import { onMount } from 'svelte';
  import { createCustomerPortalSession } from '$lib/api/functions';

  let showAccountDeletionModal = false;
  let showEmailChangeModal = false;

  if (!$user) {
    goto(`${routes.SIGN_IN}?continueUrl=${encodeURIComponent(routes.ACCOUNT)}`);
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
  const hideGardenTemporarily = async (event: Event) => {
    // "checked" means "take off the map" (opposite of listed)
    const newListedStatus = !(event.target as HTMLInputElement)?.checked;
    updatingListedStatus = true;
    try {
      await changeListedStatus(newListedStatus);
      if (!newListedStatus) notify.success($_('account.notify.garden-no-show'), 7000);
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

  // Proactively request a customer portal link if it may be used.
  // This leads to it being immediately ready to be inserted as a simple anchor link, and prevents potential popup blockers
  // with a JS-triggered redirect.
  let customerPortalLink: string | undefined;
  // TEST DO REPLACE AGAIN
  // let customerPortalLink = 'https://stripe.com';
  onMount(async () => {
    if ($user?.superfan && $hasAutoRenewingSubscription) {
      const { data } = await createCustomerPortalSession();
      customerPortalLink = data.url;
    }
  });

  const formatDate = (locale: string, date: Date) =>
    new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, { dateStyle: 'medium' }).format(
      date
    );
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
            <span class="icon icon--left">
              <Icon icon={emailIcon} />
            </span>
            {$user.email}
            <button class="icon icon--right" on:click={() => (showEmailChangeModal = true)}>
              <Icon icon={pencilIcon} clickable />
              <!-- Text for accessibility -->
              <span class="screen-reader">Change email address</span>
            </button>
          </div>
          <div>
            <span class="icon">
              <Icon icon={flagIcon} />
            </span>
            {$countryNames[$user.countryCode]}
          </div>
        </div>
        {#if $hasValidSubscription && $user.stripeSubscription}
          <div class="superfan-validity" class:auto-renewing={$hasAutoRenewingSubscription}>
            <p>
              {#if $hasAutoRenewingSubscription && typeof $user.stripeSubscription?.canceledAt === 'number'}
                <!-- The user scheduled the cancellation -->
                ✅ Your membership ends on {formatDate(
                  $locale || 'en',
                  new Date($user.stripeSubscription?.canceledAt * 1000)
                )}.<br />Automatic renewal deactivated.
              {:else if $hasAutoRenewingSubscription}
                ✅ Your membership is active.<br />Automatically renews on {formatDate(
                  $locale || 'en',
                  new Date($user.stripeSubscription.currentPeriodEnd * 1000)
                )}.
              {:else}
                <!-- In the send_invoice case -->
                ✅ {$_('account.superfan.valid', {
                  values: {
                    date: formatDate(
                      $locale || 'en',
                      new Date($user.stripeSubscription?.currentPeriodEnd * 1000)
                    )
                  }
                })}
              {/if}
            </p>
            {#if $hasAutoRenewingSubscription}
              <Button
                small
                inverse
                link
                oneline
                orange={false}
                loading={typeof customerPortalLink === 'undefined'}
                target="_blank"
                href={customerPortalLink ?? ''}>Manage membership</Button
              >
            {/if}
          </div>
        {:else if $user.stripeSubscription}
          <!-- The invalid subscription state is assumed from the alternative of the case above -->
          <!-- TODO: in charge_automatically we might need to show that some payment errors occurred
               and a button to the management portal -->
          <div class="superfan-validity invalid">
            <p>{@html $_('account.superfan.just-ended')}</p>
            <Button
              xxsmall
              uppercase
              on:click={() => {
                if ($hasOpenRenewalInvoice) {
                  window.open($user?.stripeSubscription?.renewalInvoiceLink, '_blank');
                } else if ($shouldPromptForNewSubscription) {
                  window.location.href = `${routes.ABOUT_MEMBERSHIP}#pricing`;
                }
              }}>{$_('account.superfan.renew-btn-text')}</Button
            >
          </div>
        {/if}
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
      <NotificationSection />
      <section>
        <h2>{$_('account.garden.title')}</h2>
        {#if !$user.garden}
          <p class="description">{$_('account.garden.unlisted.text')}</p>
          <Button uppercase medium href={routes.ADD_GARDEN}>
            {$_('account.garden.unlisted.button')}
          </Button>
        {:else if $user.emailVerified && $user.garden}
          <LabeledCheckbox
            disabled={updatingListedStatus}
            name="listed"
            checked={!$user.garden.listed}
            label={$_('account.garden.listed.text')}
            on:input={hideGardenTemporarily}
          />
          <div class="mt-l">
            <Button href={routes.MANAGE_GARDEN} medium uppercase>
              {$_('account.garden.listed.button')}
            </Button>
          </div>
        {:else if $user.garden && !$user.emailVerified}
          <p class="mb-m">{$_('account.garden.unverified.text')}</p>
        {/if}
      </section>
      <section>
        <h2>{$_('account.delete.button-action')}</h2>
        <p class="description">{$_('account.delete.intro')}</p>
        <Button xxsmall on:click={() => (showAccountDeletionModal = true)}
          >{$_('account.delete.button-action')}</Button
        >
      </section>
    </div>
  </div>
{/if}

<AccountDeletionModal bind:show={showAccountDeletionModal} />
<EmailChangeModal bind:show={showEmailChangeModal} />

<style>
  button {
    /* Reset button styles */
    all: initial;
  }
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
  }

  .icon--left {
    margin-right: 0.8rem;
  }

  .icon--right {
    margin-left: 0.8rem;
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
  .description {
    margin-bottom: 1rem;
  }

  .resend-verification {
    margin-top: 1rem;
    display: block;
  }

  .superfan-validity {
    margin-top: 1rem;
  }

  .superfan-validity.invalid,
  .superfan-validity.auto-renewing {
    display: flex;
    justify-content: center;
    align-items: start;
    gap: 2.5rem;
    margin: 2rem 0 0 0;
    text-align: left;
  }

  .superfan-validity.auto-renewing {
    gap: 1.5rem;
  }

  .superfan-validity :global(.button) {
    align-self: center;
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

    .superfan-validity.auto-renewing {
      flex-direction: column;
      text-align: center;
      align-items: center;
      gap: 0rem;
      margin-top: 0.5rem;
    }
  }
</style>
