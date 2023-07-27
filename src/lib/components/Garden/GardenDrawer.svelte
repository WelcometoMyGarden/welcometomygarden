<script lang="ts">
  export let garden: Garden | null = null;

  import { createEventDispatcher, tick } from 'svelte';
  import { scale } from 'svelte/transition';
  import { _ } from 'svelte-i18n';
  import SkeletonDrawer from './SkeletonDrawer.svelte';
  import { addSavedGarden, getPublicUserProfile, removeSavedGarden } from '$lib/api/user';
  import { getGardenPhotoSmall, getGardenPhotoBig } from '$lib/api/garden';
  import { user } from '$lib/stores/auth';
  import { clickOutside } from '$lib/directives';
  import { Text, Chip, Image, Button, Progress } from '../UI';
  import {
    bonfireIcon,
    waterIcon,
    electricityIcon,
    showerIcon,
    tentIcon,
    toiletIcon,
    bookmarkEmptyIcon,
    bookmarkYellowIcon
  } from '$lib/images/icons';
  import routes from '$lib/routes';
  import type { Garden } from '$lib/types/Garden';
  import Icon from '$lib/components/UI/Icon.svelte';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { anchorText } from '$lib/util/translation-helpers';
  import HiddenPhoneNumber from './HiddenPhoneNumber.svelte';

  const dispatch = createEventDispatcher();
  const phoneRegex =
    /\+?\d{1,4}?[-/\\.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
  let descriptionEl: unknown | undefined;

  $: gardenIsSelected = !!garden;
  $: facilities = [
    { name: 'water', icon: waterIcon, label: $_('garden.facilities.labels.water') },
    {
      name: 'drinkableWater',
      icon: waterIcon,
      label: $_('garden.facilities.labels.drinkable-water')
    },
    { name: 'toilet', icon: toiletIcon, label: $_('garden.facilities.labels.toilet') },
    { name: 'bonfire', icon: bonfireIcon, label: $_('garden.facilities.labels.bonfire') },
    {
      name: 'electricity',
      icon: electricityIcon,
      label: $_('garden.facilities.labels.electricity')
    },
    { name: 'shower', icon: showerIcon, label: $_('garden.facilities.labels.shower') },
    { name: 'tent', icon: tentIcon, label: $_('garden.facilities.labels.tent') }
  ];

  let drawerElement;
  let photoWrapper: HTMLElement | undefined;
  let userInfo = null;
  let photoUrl: string | null = null;
  let biggerPhotoUrl: string | null = null;
  let infoHasLoaded = false;
  let gardenCapacity = 1;

  const setAllGardenInfo = async () => {
    try {
      userInfo = await getPublicUserProfile(garden.id);
      if (garden.photo) {
        const id = garden.previousPhotoId || garden.id;
        photoUrl = await getGardenPhotoSmall({ ...garden, id });
      }
    } catch (ex) {
      console.log(ex);
    }
  };

  let previousGarden = {};
  $: if (garden && garden.id !== previousGarden.id) {
    infoHasLoaded = false;
    userInfo = null;
    previousGarden = garden;
  }

  $: if (garden) {
    infoHasLoaded = false;
    userInfo = null;
    photoUrl = null;
    biggerPhotoUrl = null;
    setAllGardenInfo().then(() => {
      infoHasLoaded = true;
    });
    // Converting the capacity field to a number prevents XSS attacks where
    // the capacity field could be set to some HTML.
    gardenCapacity = Number(garden.facilities.capacity) || 1;
  }

  $: ownedByLoggedInUser = $user && garden && $user.id === garden.id;
  $: isSaved =
    ($user && garden?.id && $user.savedGardens && $user.savedGardens.includes(garden.id)) || false;

  let isShowingMagnifiedPhoto = false;
  let isGettingMagnifiedPhoto = false;
  const magnifyPhoto = async () => {
    isGettingMagnifiedPhoto = true;
    try {
      if (garden.photo) {
        const id = garden.previousPhotoId || garden.id;
        biggerPhotoUrl = await getGardenPhotoBig({ ...garden, id });
      }
    } catch (ex) {
      console.log(ex);
    }
    isShowingMagnifiedPhoto = true;
    isGettingMagnifiedPhoto = false;

    // See https://stackoverflow.com/a/60112649
    await tick();
    photoWrapper?.focus();
  };

  const handleClickOutsideDrawer = (event) => {
    const { clickEvent } = event.detail;
    // If the drawer is not open, don't try to close it
    // (this might mess with focus elsewhere on the page)
    if (!gardenIsSelected) {
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

  const saveGarden = async () => {
    if (!garden?.id) return;

    try {
      if (isSaved) {
        await removeSavedGarden(garden.id);
        trackEvent(PlausibleEvent.UNSAVE_GARDEN);
      } else {
        await addSavedGarden(garden.id);
        trackEvent(PlausibleEvent.SAVE_GARDEN);
      }
    } catch (err) {
      console.log(err);
    }
  };

  $: chatWithGardenLink = `${routes.CHAT}?with=${garden?.id}`;

  const createPhoneNumberPlaceHolder = (length: number) => {
    const container = document.createElement('span');
    new HiddenPhoneNumber({
      target: container,
      props: {
        length
      }
    });
    return container;
  };

  $: isPhoneNumberInDescription = garden?.description ? phoneRegex.test(garden.description) : false;

  $: if (descriptionEl) {
    // Replace hidden phone numbers with a component.
    const el = descriptionEl.firstChild as HTMLParagraphElement;
    const hiddenNumberRegex = /\[(\*+)\]/;
    if (hiddenNumberRegex.test(el?.textContent)) {
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split#splitting_with_a_regexp_to_include_parts_of_the_separator_in_the_result
      // We use groups in the regex to still have access to the length of the phone number.
      // Returns an array like ['sms me at ', 8, ' or ', 9]
      const newNodes = el.textContent
        .split(hiddenNumberRegex)
        .map((el) =>
          el.match(/\*+/) ? createPhoneNumberPlaceHolder(el.length) : document.createTextNode(el)
        );

      // Remove the original text node of <p>
      el.firstChild.remove();
      // Re-insert new nodes
      for (const node of newNodes) {
        el.appendChild(node);
      }
    }
  }
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
      <img alt={$_('generics.garden')} src={biggerPhotoUrl} />
    </div>
  </button>
{/if}

<div
  class="drawer"
  class:hidden={!gardenIsSelected}
  bind:this={drawerElement}
  use:clickOutside
  on:click-outside={handleClickOutsideDrawer}
>
  {#if gardenIsSelected && infoHasLoaded}
    <section class="main">
      <header>
        <div class="mb-l garden-title">
          <Text weight="w600" size="l" className="garden-title-text">
            {#if ownedByLoggedInUser}
              {$_('garden.drawer.owner.your-garden')}
            {:else}{userInfo.firstName}{/if}
          </Text>
          {#if $user?.superfan}
            <button class="button-container" on:click={saveGarden}>
              <div class="button-save">
                <Icon icon={isSaved ? bookmarkYellowIcon : bookmarkEmptyIcon} />
                <Text weight="inherit"
                  >{isSaved ? $_('garden.drawer.saved') : $_('garden.drawer.save')}</Text
                >
              </div>
            </button>
          {/if}
        </div>
        {#if garden?.photo}
          <button on:click={magnifyPhoto} class="mb-l button-container image-wrapper">
            {#if photoUrl}
              <Image src={photoUrl} />
            {/if}
          </button>
        {/if}
      </header>
      <div class="drawer-content-area">
        <div class="description" bind:this={descriptionEl}>
          <Text class="mb-l"
            >{$user?.superfan
              ? garden?.description
              : garden?.description.replaceAll(
                  phoneRegex,
                  // With client-side code, we replace this with more aesthetic HTML & CSS (see above).
                  // We can not use the @html directive here, because of a high XSS injection risk.
                  (match) => `[${'*'.repeat(match.length)}]`
                )}</Text
          >
          {#if isPhoneNumberInDescription && !$user?.superfan}
            <p class="phone-notice">
              {$_('garden.drawer.phone-notice')}
            </p>
          {/if}
          <p />
        </div>
        <div class="chips-container">
          {#each facilities as facility (facility.name)}
            {#if garden.facilities[facility.name]}
              <Chip icon={facility.icon}>{facility.label}</Chip>
            {/if}
          {/each}
        </div>
        {#if garden.facilities.capacity}
          <p class="mt-m capacity">
            {@html $_('garden.drawer.facilities.capacity', {
              values: {
                capacity: gardenCapacity,
                styleCapacity: `<strong>${gardenCapacity}</strong>`
              }
            })}
          </p>
        {/if}
      </div>
      <footer class="footer mt-m">
        {#if userInfo.languages}
          <Text class="mb-m">
            {userInfo.firstName} speaks
            <Text is="span" weight="bold">Dutch & English</Text>
          </Text>
        {/if}
        {#if ownedByLoggedInUser}
          <Button href={routes.MANAGE_GARDEN} uppercase medium>
            {$_('garden.drawer.owner.button')}
          </Button>
        {:else}
          {#if !$user}
            <p class="cta-hint">
              {@html $_('garden.drawer.guest.login', {
                values: {
                  signInLink: `<a class='link' href=${routes.SIGN_IN}>${$_(
                    'garden.drawer.guest.sign-link-text'
                  )}</a>`
                }
              })}
            </p>
          {:else if !!$user && !$user.superfan}
            <p class="cta-hint">
              {@html $_('garden.drawer.guest.become-member', {
                values: {
                  becomeMember: anchorText({
                    href: chatWithGardenLink,
                    linkText: $_('garden.drawer.guest.become-member-text'),
                    newtab: false,
                    class: 'link'
                  })
                }
              })}
            </p>
          {/if}
          <Button href={chatWithGardenLink} disabled={!$user || !$user.superfan} uppercase medium>
            {$_('garden.drawer.guest.button')}
          </Button>
        {/if}
      </footer>
    </section>
  {:else if !infoHasLoaded}
    <SkeletonDrawer />
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

  .garden-title {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .garden-title .button-container {
    /* Override the 100% width that causes 
       the paragraph on the left to collapse on desktop drawers. */
    width: auto;
    margin-left: 1rem;
  }

  .button-save {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    font-weight: 500;
  }

  .button-save :global(i) {
    width: 1.5rem;
    height: 1.5rem;
    margin-right: 0.5rem;
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
  }

  .image-wrapper:hover {
    cursor: zoom-in;
  }

  @media screen and (max-height: 800px) {
    .drawer {
      max-height: 70%;
    }
    .drawer-content-area {
      margin-top: 1.2rem;
    }

    .drawer :global(.mb-l) {
      margin-bottom: 0.4rem;
    }

    /* .image-wrapper {
      position: absolute;
      top: 1.5rem;
      right: 3rem;
      margin-bottom: 0;
    } */
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
      margin-top: 1.2rem;
    }

    /* .image-wrapper {
      position: absolute;
      top: 1.5rem;
      right: 3rem;
      margin-bottom: 0;
    } */

    .drawer :global(.mb-l) {
      margin-bottom: 0.4rem;
    }
  }

  .chips-container {
    display: flex;
    flex-wrap: wrap;
    /* Negative margin compensate the Badge components margins */
    margin-top: calc(0.8rem * -1);
  }

  .description {
    max-width: 45rem;
    word-wrap: break-word;
  }

  .phone-notice {
    font-size: 1.2rem;
    font-style: italic;
    margin: 1rem 0;
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

  .magnified-photo img {
    max-width: 100%;
    max-height: 100%;
  }

  .capacity {
    font-size: 1.4rem;
  }

  .cta-hint {
    text-align: center;
    margin-bottom: 1rem;
    font-size: 1.4rem;
  }
</style>
