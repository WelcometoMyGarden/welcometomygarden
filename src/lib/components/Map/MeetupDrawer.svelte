<script lang="ts">
  // Stripped-down version of GardenDrawer
  import { createEventDispatcher, tick } from 'svelte';
  import { scale } from 'svelte/transition';
  import { _, locale } from 'svelte-i18n';
  import { user } from '$lib/stores/auth';
  import { clickOutside } from '$lib/directives';
  import { Text, Button, Progress, Icon } from '../UI';
  import routes from '$lib/routes';
  import type { Meetup } from './MeetupLayer.svelte';
  import createUrl from '$lib/util/create-url';
  import Img from '@zerodevx/svelte-img';
  import meetupImg from '$lib/assets/wtmg-meetup.png?as=run';
  import { coerceToMainLanguage } from '$lib/util/get-browser-lang';
  import { crossIcon } from '$lib/images/icons';

  export let meetup: Meetup | null = null;

  let drawerElement;

  const dispatch = createEventDispatcher();
  $: isSelected = !!meetup;
  let photoWrapper: HTMLElement | undefined;
  let isShowingMagnifiedPhoto = false;
  let isGettingMagnifiedPhoto = false;
  const magnifyPhoto = async () => {
    isGettingMagnifiedPhoto = true;
    isShowingMagnifiedPhoto = true;
    isGettingMagnifiedPhoto = false;
    // See https://stackoverflow.com/a/60112649
    await tick();
    photoWrapper?.focus();
  };

  $: meetupDateStr = Intl.DateTimeFormat($locale || 'nl-BE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(meetup?.date);

  const handleClickOutsideDrawer = (event) => {
    const { clickEvent } = event.detail;
    // If the drawer is not open, don't try to close it
    // (this might mess with focus elsewhere on the page)
    if (!isSelected) {
      return;
    }
    // If closing maginified photo view, don't close drawer
    if (isShowingMagnifiedPhoto && photoWrapper.contains(clickEvent.target)) {
      return;
    }
    // If showing/hiding trails, don't close drawer
    else if (
      (clickEvent.target instanceof HTMLInputElement && clickEvent.target.type == 'checkbox') ||
      clickEvent.target.tagName == 'LABEL'
    ) {
      return;
    } else if (!drawerElement.contains(clickEvent.target)) {
      dispatch('close');
    }
  };
</script>

<Progress active={isGettingMagnifiedPhoto} />
{#if isShowingMagnifiedPhoto && !isGettingMagnifiedPhoto}
  <button
    class="magnified-photo-wrapper"
    transition:scale
    bind:this={photoWrapper}
    on:click={() => {
      isShowingMagnifiedPhoto = false;
    }}
    on:keypress={(e) => {
      // keypress handler to satisfy svelte linter for a11y
      switch (e.key) {
        case 'Enter':
        // Don't do anything: the on:click will also be called when Enter is pressed
      }
    }}
  >
    <div class="magnified-photo">
      <Img class="meetup-img" src={meetupImg} alt="Invitational poster for a WTMG meetup" />
    </div>
  </button>
{/if}

<div
  class="drawer"
  class:hidden={!isSelected}
  bind:this={drawerElement}
  use:clickOutside
  on:click-outside={handleClickOutsideDrawer}
>
  {#if isSelected}
    <section class="main">
      <header>
        <div class="mb-l garden-title">
          <Text weight="w600" size="l" className="garden-title-text"
            >WTMG meetup - {meetupDateStr}</Text
          >
          <div class="top-buttons">
            <button class="close-button" on:click={() => dispatch('close')}>
              <Icon icon={crossIcon} />
            </button>
          </div>
        </div>
        <button on:click={magnifyPhoto} class="mb-l button-container image-wrapper">
          <Img class="meetup-img" src={meetupImg} alt="Invitational poster for a WTMG meetup" />
        </button>
      </header>
      <div class="drawer-content-area">
        <div class="description">
          <p>
            {$_('map.meetups.description', {
              values: {
                location: $_(`map.meetups.cities.${meetup?.place}`),
                date: meetupDateStr
              }
            })}
          </p>
        </div>
      </div>
      <footer class="footer mt-m">
        {#if $user}
          <Button
            href={createUrl(
              `${meetup?.registrationLink}/${coerceToMainLanguage($locale || undefined)}`,
              {
                ref: 'map',
                wtmg: $user?.id
              }
            )}
            target="_blank"
            fullWidth
            gardenStyle
          >
            {$_('map.meetups.btn-register')}
          </Button>
        {:else}
          <p class="cta-hint">
            {@html $_('map.meetups.no-account', {
              values: {
                signInLink: `<a class='link' href=${routes.SIGN_IN}>${$_(
                  'garden.drawer.guest.sign-link-text'
                )}</a>`
              }
            })}
          </p>
        {/if}
      </footer>
    </section>
  {/if}
</div>

<style>
  .drawer {
    display: flex;
    flex-direction: column;
    position: absolute;
    font-family: var(--fonts-copy);
    top: 50%;
    right: 0;
    background-color: white;
    width: 38rem;
    max-height: 80%;
    z-index: 200;
    padding: 3rem 2rem 0;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
    border-top-left-radius: 1rem;
    border-bottom-left-radius: 1rem;
    transform: translateY(-50%);
    transition: right 250ms;
  }

  .drawer.hidden {
    right: -38rem;
    min-height: 30rem;
  }

  .main {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .drawer-content-area {
    overflow-y: auto;
  }

  .top-buttons {
    display: flex;
    align-items: center;
    justify-content: right;
  }
  .top-buttons button {
    background: none;
    border: none;
    margin-left: 1rem;
    padding: 5px;
  }

  .garden-title {
    margin-bottom: 0;
  }
  .garden-title .top-buttons > button:hover {
    cursor: pointer;
    background-color: var(--color-gray-bg);
  }
  .garden-title .top-buttons > button:active {
    background-color: var(--color-gray);
  }

  .top-buttons button.close-button {
    display: none;
    align-items: center;
    justify-content: center;
    background: var(--color-gray-bg);
    border-radius: 50%;
  }
  .top-buttons button.close-button :global(i) {
    width: 2rem;
    height: 2rem;
  }
  .top-buttons button.close-button:hover {
    background: var(--color-gray);
  }

  .garden-title {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2rem 0;
  }

  .image-wrapper {
    width: 6rem;
    height: 6rem;
    background-color: var(--color-beige);
    border-radius: 1rem;
    margin-bottom: 2rem;
    margin-top: 1.4rem;
  }

  .image-wrapper:hover {
    cursor: zoom-in;
  }

  .image-wrapper :global(.meetup-img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 1rem;
  }

  @media screen and (max-height: 800px) {
    .drawer {
      max-height: 70%;
    }

    .drawer :global(.mb-l) {
      margin-bottom: 0.4rem;
    }
  }

  @media screen and (max-width: 700px) {
    .drawer {
      min-height: auto;
      max-height: calc(var(--vh, 1vh) * 70);
      top: auto;
      right: auto;
      bottom: 0;
      transform: none;
      width: 100%;
      border-top-right-radius: 2rem;
      border-top-left-radius: 2rem;
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 0;
      transition: transform 250ms;
    }
    .drawer.hidden {
      right: 0;
      transform: translateY(100rem);
    }

    .drawer-content-area {
      margin-top: 0.6rem;
    }

    .image-wrapper {
      margin-top: 0.5rem;
      margin-bottom: 0;
    }

    .drawer :global(.mb-l) {
      margin-bottom: 0.4rem;
    }

    .top-buttons button.close-button {
      display: flex;
    }
    .top-buttons button.close-button :global(i) {
      width: 2.2rem;
      height: 2.2rem;
    }
  }

  .description {
    max-width: 45rem;
    word-wrap: break-word;
  }

  .magnified-photo-wrapper {
    width: 100vw;
    height: calc(var(--vh, 1vh) * 100);
    left: 0;
    top: 0;
    background-color: rgba(0, 0, 0, 0.6);
    position: fixed;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .magnified-photo {
    max-width: 192rem;
    max-height: calc(var(--vh, 1vh) * 60);
    width: auto;
    height: calc(var(--vh, 1vh) * 80);
  }

  .magnified-photo :global(img) {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .cta-hint {
    text-align: center;
    margin-bottom: 1rem;
    font-size: 1.4rem;
  }
</style>
