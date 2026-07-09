<!-- @component
  Modal that invites the user to share WTMG through various channels. Centered on
  desktop, a bottom sheet on mobile (both via the shared `Modal.svelte`).

  Each channel logs a `Share WTMG` Plausible event with its `share_target`.
-->
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { innerWidth } from 'svelte/reactivity/window';
  import { Modal } from '$lib/components/UI';
  import ShareButton from './ShareButton.svelte';
  import {
    facebookLogoIcon,
    linkIcon,
    whatsappLogoIcon,
    instagramLogoIcon,
    envelopeIcon
  } from '$lib/images/icons';
  import { MOBILE_BREAKPOINT, WTMG_WEBSITE_URL, WTMG_INSTAGRAM_URL } from '$lib/constants';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import notify from '$lib/stores/notification';

  interface Props {
    show?: boolean;
  }

  let { show = $bindable(false) }: Props = $props();

  const isMobile = $derived(innerWidth.current != null && innerWidth.current <= MOBILE_BREAKPOINT);

  const ariaLabelledBy = 'share-wtmg-title';

  // Brand colours for the outlined channel icons.
  const WHATSAPP_GREEN = '#25d366';
  const INSTAGRAM_PINK = '#e1306c';

  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    WTMG_WEBSITE_URL
  )}`;
  let whatsappHref = $derived(
    `https://wa.me/?text=${encodeURIComponent($_('share-wtmg.whatsapp-text'))}`
  );
  let emailHref = $derived(
    `mailto:?subject=${encodeURIComponent($_('share-wtmg.email-subject'))}&body=${encodeURIComponent(
      $_('share-wtmg.email-body')
    )}`
  );

  const track = (share_target: 'WhatsApp' | 'Instagram' | 'Facebook' | 'Email' | 'Copy link') =>
    trackEvent(PlausibleEvent.SHARE_WTMG, { share_target });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(WTMG_WEBSITE_URL);
      notify.success($_('share-wtmg.copy-link-done'));
    } catch {
      notify.danger($_('share-wtmg.copy-link-error'));
    }
    track('Copy link');
  };
</script>

<Modal
  bind:show
  center={!isMobile}
  stickToBottom={isMobile}
  nopadding={isMobile}
  maxWidth="52rem"
  {ariaLabelledBy}
  ariaDescribedBy="share-wtmg-subtitle"
>
  {#snippet title()}
    <div class="title-section">
      <h2 id={ariaLabelledBy} class="title">{$_('share-wtmg.title')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div class="share-body">
      <p id="share-wtmg-subtitle" class="subtitle">{$_('share-wtmg.subtitle')}</p>
      <div class="channels">
        <ShareButton
          primary
          icon={facebookLogoIcon}
          href={facebookHref}
          target="_blank"
          onclick={() => track('Facebook')}
        >
          {$_('share-wtmg.facebook')}
        </ShareButton>
        <ShareButton icon={linkIcon} onclick={copyLink}>
          {$_('share-wtmg.copy-link')}
        </ShareButton>
        <ShareButton
          icon={whatsappLogoIcon}
          iconColor={WHATSAPP_GREEN}
          href={whatsappHref}
          target="_blank"
          onclick={() => track('WhatsApp')}
        >
          {$_('share-wtmg.whatsapp')}
        </ShareButton>
        <ShareButton
          icon={instagramLogoIcon}
          iconColor={INSTAGRAM_PINK}
          href={WTMG_INSTAGRAM_URL}
          target="_blank"
          onclick={() => track('Instagram')}
        >
          {$_('share-wtmg.instagram')}
        </ShareButton>
        <ShareButton icon={envelopeIcon} href={emailHref} onclick={() => track('Email')}>
          {$_('share-wtmg.email')}
        </ShareButton>
      </div>
    </div>
  {/snippet}
</Modal>

<style>
  /* Fill the header so the centered title spans the full modal width, offsetting
     the 30px close button on the right (mirrors MapToolModal). */
  .title-section {
    flex: 1;
    padding-left: 30px;
  }

  .title {
    font-family: var(--fonts-titles);
    font-weight: bold;
    font-size: 2.4rem;
    line-height: 1.2;
    text-align: center;
  }

  .subtitle {
    font-size: 1.5rem;
    line-height: 1.5;
    margin-bottom: 2rem;
  }

  .channels {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  @media screen and (max-width: 700px) {
    .title {
      font-size: 2rem;
    }
  }
</style>
