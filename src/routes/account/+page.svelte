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
    canPayRenewalInvoice,
    hasValidSubscription
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
    new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : locale, { dateStyle: 'short' }).format(
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
        <div
          class="infogrid"
          class:has-sub={!!$user.stripeSubscription}
          class:auto-renewing={$hasAutoRenewingSubscription}
          class:valid={$hasValidSubscription}
        >
          <div class="email-address">
            <span class="icon icon--left">
              <Icon icon={emailIcon} />
            </span>
            {$user.email}
            <button class="icon icon--right" on:click={() => (showEmailChangeModal = true)}>
              <Icon icon={pencilIcon} clickable />
              <!-- Text for accessibility -->
              <span class="screen-reader">{$_('account.change-email.modal.title')}</span>
            </button>
          </div>
          <div class="flag-container">
            <span class="icon flag">
              <Icon icon={flagIcon} />
            </span>
            {$countryNames[$user.countryCode]}
          </div>
          {#if $hasValidSubscription && $user.stripeSubscription}
            <p class="superfan-validity">
              {#if $hasAutoRenewingSubscription && typeof $user.stripeSubscription?.canceledAt === 'number'}
                <!-- The user scheduled the cancellation -->
                ✅ {@html $_('account.superfan.auto-canceled', {
                  values: {
                    date: formatDate(
                      $locale || 'en',
                      new Date($user.stripeSubscription?.cancelAt * 1000)
                    )
                  }
                })}
              {:else if $hasAutoRenewingSubscription}
                ✅ {@html $_('account.superfan.auto-active', {
                  values: {
                    date: formatDate(
                      $locale || 'en',
                      new Date($user.stripeSubscription.currentPeriodEnd * 1000)
                    )
                  }
                })}
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
                orange={false}
                target="_blank"
                href={customerPortalLink ?? ''}>{$_('account.superfan.btn-manage')}</Button
              >
            {/if}
          {:else if $user.stripeSubscription}
            <!-- The invalid subscription state is assumed from the alternative of the case above -->
            <!-- TODO: in charge_automatically we might need to show that some payment errors occurred
               and a button to the management portal -->
            <p class="superfan-validity invalid">{@html $_('account.superfan.just-ended')}</p>
            <Button
              xxsmall
              uppercase
              on:click={() => {
                if ($canPayRenewalInvoice) {
                  // Only valid for send_invoice
                  window.open($user?.stripeSubscription?.renewalInvoiceLink, '_blank');
                } else {
                  window.location.href = `${routes.ABOUT_MEMBERSHIP}#pricing`;
                }
              }}>{$_('account.superfan.renew-btn-text')}</Button
            >
          {/if}
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
    padding-bottom: 2rem;
    border-bottom: 2px solid var(--color-gray);
    margin-bottom: 2rem;
  }

  .user-information > h2 {
    text-align: center;
  }

  .infogrid {
    display: grid;
    grid-template-columns: auto min-content;
    /* Aligns with email pref checkbox */
    gap: 1.2rem 1.5rem;
    padding: 0 1rem 0 4rem;
  }

  /* If the second row only has one element, or no elements  */
  .infogrid.valid:not(.auto-renewing),
  .infogrid:not(.has-sub) {
    display: flex;
    padding: 0;
    justify-content: center;
    flex-wrap: wrap;
  }
  .infogrid.valid:not(.auto-renewing) .superfan-validity {
    width: 100%;
    text-align: center;
  }
  .infogrid.valid:not(.auto-renewing) .email-address,
  .infogrid:not(.has-sub) .email-address {
    margin-right: 2rem;
  }

  .flag-container {
    /* Ensure that the flag icon never collapses
    despite a min-content in the parent grid
     */
    width: max-content;
  }
  .icon {
    width: 2rem;
    height: 1.5rem;
    display: inline-block;
  }
  .icon.flag {
    vertical-align: top;
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

  .infogrid :global(.button) {
    align-self: center;
    max-width: 12rem;
  }
  .infogrid.auto-renewing :global(.button) {
    text-align: left;
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
    .infogrid {
      display: flex;
      padding: 0;
      justify-content: center;
      flex-wrap: wrap;
      text-align: center;
      gap: 0 1rem;
    }
    .infogrid :global(.button) {
      max-width: unset;
    }
    .superfan-validity {
      margin-top: 1.4rem;
      margin-bottom: 1rem;
    }
  }

  @media (max-width: 400px) {
    .email-address {
      margin-bottom: 1rem;
    }
  }
</style>
