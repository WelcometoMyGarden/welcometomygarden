<script lang="ts">
  import { LabeledCheckbox, ToggleAble } from '$lib/components/UI';
  import { _ } from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import {
    crossIcon,
    cyclistIcon,
    hikerIcon,
    routesIcon,
    tentIcon,
    trainIcon
  } from '$lib/images/icons';
  import MemberFeatureIcons from '$lib/components/LayersAndTools/MemberFeatureIcons.svelte';
  import { user } from '$lib/stores/auth';
  import Icon from '$lib/components/UI/Icon.svelte';
  import IconButton from '$lib/components/UI/IconButtonOld.svelte';
  import routes from '$lib/routes';
  import { anchorText, lr } from '$lib/util/translation-helpers';
  import { clickOutside } from '$lib/attachments';
  import GardensTools from '$lib/components/LayersAndTools/GardensTools.svelte';
  import GardensModal from '$lib/components/LayersAndTools/GardensModal.svelte';
  import TrailsModal from '$lib/components/LayersAndTools/TrailsModal.svelte';
  import TransportModal from '$lib/components/LayersAndTools/TransportModal.svelte';
  import TrailsTool from '$lib/components/LayersAndTools/TrailsTool.svelte';
  import TransportTools from '$lib/components/LayersAndTools/TransportTools.svelte';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { MOBILE_BREAKPOINT } from '$lib/constants';
  import { innerWidth } from 'svelte/reactivity/window';

  interface Props {
    showHiking?: boolean;
    showCycling?: boolean;
    showGardens: boolean;
    showSavedGardens: boolean;
    showTransport: boolean;
    showFileTrailModal: boolean;
    onShowMembershipNotice?: () => void;
    onBecomeMember?: () => void;
  }

  let {
    showHiking = $bindable(false),
    showCycling = $bindable(false),
    showGardens = $bindable(),
    showSavedGardens = $bindable(),
    showTransport = $bindable(),
    showFileTrailModal = $bindable(),
    onShowMembershipNotice = () => {},
    onBecomeMember = () => {}
  }: Props = $props();
  let showGardensModal = $state(false);
  let showTrailsModal = $state(false);
  let showTransportModal = $state(false);

  let isMobile = $derived(innerWidth.current && innerWidth.current <= MOBILE_BREAKPOINT);

  let superfan = $derived($user?.superfan);

  let memberNoticeCopy = $derived(
    $_('map.superfan-notice.description', {
      values: {
        linkText: anchorText({
          href: `${$lr(routes.ABOUT_MEMBERSHIP)}#pricing`,
          linkText: $_('map.superfan-notice.linkText'),
          newtab: false,
          class: 'underline'
        })
      }
    })
  );

  const toggleFileTrailModal = (_: Event) => {
    showFileTrailModal = !showFileTrailModal;
    if (showFileTrailModal) {
      trackEvent(PlausibleEvent.START_ROUTE_UPLOAD_FLOW);
    }
  };

  let showMemberNotice = $state(false);

  const toggleMemberNotice = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobile) {
      onShowMembershipNotice();
    } else {
      showMemberNotice = !showMemberNotice;
    }
  };

  const handleBecomeMember = () => {
    // Close the notice in any case, since we're opening another modal
    showMemberNotice = false;
    onBecomeMember();
  };
</script>

<div class="layers-and-tools">
  <!-- Tools for members -->
  {#if superfan}
    {#if !isMobile}
      <!-- Members - desktop tools -->
      <div class="layers-and-tools-superfan">
        <ToggleAble>
          {#snippet title()}
            <span>{$_('map.gardens.title')}</span>
          {/snippet}
          {#snippet content()}
            <div>
              <GardensTools bind:showGardens bind:showSavedGardens />
            </div>
          {/snippet}
        </ToggleAble>

        <ToggleAble>
          {#snippet title()}
            <span>{$_('map.routes.title')}</span>
          {/snippet}
          {#snippet content()}
            <div>
              <TrailsTool bind:showCycling bind:showHiking onclick={toggleFileTrailModal} />
            </div>
          {/snippet}
        </ToggleAble>

        <ToggleAble>
          {#snippet title()}
            <span>{$_('map.railway.title')}</span>
          {/snippet}
          {#snippet content()}
            <div>
              <TransportTools bind:showTransport />
            </div>
          {/snippet}
        </ToggleAble>
      </div>
    {:else}
      <!-- Members - mobile tools -->
      <div class="layers-and-tools-superfan-mobile">
        <div class="fab">
          <IconButton xsmall onclick={() => (showGardensModal = !showGardensModal)}>
            <div class="fab-icon">
              <Icon icon={tentIcon} whiteStroke />
            </div>
          </IconButton>
        </div>
        <div class="fab">
          <IconButton xsmall onclick={() => (showTrailsModal = !showTrailsModal)}>
            <div class="fab-icon">
              <Icon icon={routesIcon} whiteStroke />
            </div>
          </IconButton>
        </div>
        <div class="fab">
          <IconButton xsmall onclick={() => (showTransportModal = !showTransportModal)}>
            <div class="fab-icon">
              <Icon icon={trainIcon} whiteStroke />
            </div>
          </IconButton>
        </div>
      </div>
    {/if}

    {#if isMobile}
      <GardensModal bind:show={showGardensModal} bind:showGardens bind:showSavedGardens />
      <TrailsModal
        bind:show={showTrailsModal}
        bind:showCycling
        bind:showHiking
        onclick={toggleFileTrailModal}
      />
      <TransportModal bind:show={showTransportModal} bind:showTransport />
    {/if}
  {:else}
    <!-- Non-member tools -->
    <div class="layers-and-tools-visitors-container">
      <div class="layers-and-tools-visitors">
        <div>
          <LabeledCheckbox
            name="hiking"
            icon={hikerIcon}
            label={$_('map.trails.hiking')}
            bind:checked={showHiking}
            compact
          />
        </div>
        <div>
          <LabeledCheckbox
            name="cycling"
            icon={cyclistIcon}
            label={$_('map.trails.cycling')}
            bind:checked={showCycling}
            compact
          />
        </div>
        <span class="attribution">
          {@html $_('map.trails.attribution', {
            values: {
              link: `<a href="https://waymarkedtrails.org/" target="_blank" rel="noreferrer">Waymarked Trails</a>`
            }
          })}
        </span>
      </div>
      {#if showMemberNotice && !isMobile}
        <div
          class="member-notice"
          in:fly={{ x: -260, duration: 200 }}
          {@attach clickOutside}
          onclickoutside={() => (showMemberNotice = false)}
          style:width="calc({memberNoticeCopy.length}rem / 7.5)"
        >
          <button
            class="button-container member-notice-close"
            onclick={(e) => {
              e.stopPropagation();
              showMemberNotice = false;
            }}
            aria-label="Close notice"
          >
            <Icon icon={crossIcon} />
          </button>
          <div class="member-notice-header">
            <p class="member-notice-title">{$_('map.superfan-notice.title')}</p>
            <MemberFeatureIcons direction="horizontal" />
          </div>
          <p
            class="member-notice-text"
            onclickcapture={(ev) => {
              if ((ev.target as HTMLParagraphElement)?.tagName === 'A') {
                ev.preventDefault();
                ev.stopPropagation();
                handleBecomeMember();
              }
            }}
          >
            {@html memberNoticeCopy}
          </p>
        </div>
      {:else}
        <button
          class="button-container member-notice-icons"
          onclick={toggleMemberNotice}
          aria-label={$_('map.superfan-notice.title')}
        >
          <MemberFeatureIcons />
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  :root {
    --layers-and-tools-height: 21rem;
  }
  .layers-and-tools {
    background-color: transparent;
    bottom: 0;
    left: 0;
    position: absolute;
    /* height: var(--layers-and-tools-height); */
  }

  .layers-and-tools-superfan {
    background-color: rgba(255, 255, 255, 0.9);
    width: 26rem;
    padding: 1rem;
  }

  .layers-and-tools-superfan-mobile {
    display: flex;
    flex-direction: column;
    position: absolute;
    bottom: 0;
    left: 0;
    padding: 1rem;
  }

  .layers-and-tools-superfan-mobile .fab {
    margin: 0.5rem 0;
    width: 4rem;
  }

  .layers-and-tools-superfan-mobile .fab-icon {
    width: 3rem;
    height: 3rem;
  }

  .attribution {
    font-size: 1.2rem;
    margin-top: 0.3rem;
    line-height: 120%;
    display: inline-block;
    max-width: 26rem;
  }

  .attribution :global(a) {
    text-decoration: underline;
  }

  .layers-and-tools-visitors-container {
    background-color: transparent;
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto;
    align-items: stretch;
    width: 100%;
    position: relative;
  }

  .layers-and-tools-visitors > div {
    white-space: nowrap;
  }

  .layers-and-tools-visitors {
    background-color: rgba(255, 255, 255, 0.9);
    padding: 1rem;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  /* In fullscreen on iOS PWA, this will touch the edge of the bottom */
  :global(body div.app.fullscreen .layers-and-tools-visitors) {
    padding-bottom: max(env(safe-area-inset-bottom, 0), 1rem);
  }

  .layers-and-tools :global(a.underline) {
    text-decoration: underline;
    cursor: pointer;
  }

  .member-notice-icons {
    background-color: var(--color-superfan-yellow);
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    padding: 0.8rem;
    cursor: pointer;
    transition: background-color 0.24s;
  }

  .member-notice-icons:hover {
    background-color: color-mix(in srgb, var(--color-superfan-yellow) 96%, rgb(79, 59, 7));
  }

  .member-notice-icons :global(.icons) {
    height: 100%;
  }

  .member-notice {
    background-color: var(--color-superfan-yellow);
    padding: 1rem 1rem 1rem 1.2rem;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    position: relative;
    /* As a fallback, see the locale-dependent style calc in the template  */
    width: 26.5rem;
  }

  .member-notice-header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding-right: 2rem;
  }

  .member-notice-title {
    font-size: 1.4rem;
    font-weight: 700;
  }

  .member-notice-text {
    font-size: 1.3rem;
    font-weight: 300;
    margin-top: 0.4rem;
    line-height: 1.4;
  }

  .member-notice-close {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    padding: 0.3rem;
    cursor: pointer;
    width: 2.4rem;
    height: 2.4rem;
  }

  @media screen and (max-width: 700px) {
    /* Hacky quick fix start: don't allow long French copy to push the superfan notice
       off-screen & cover the map scale.
       TODO: apply a more sustainable solution for all locales
    */
    :global(div.locale-fr) .layers-and-tools-visitors > div {
      white-space: normal;
    }

    :global(div.locale-fr) .layers-and-tools-visitors-container {
      max-width: 82%;
    }

    .layers-and-tools-visitors {
      padding: 0.5rem 1rem;
      gap: 0;
    }

    .attribution {
      margin-top: 0;
      line-height: 1.6;
    }
  }
</style>
