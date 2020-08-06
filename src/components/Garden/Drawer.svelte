<script>
  export let garden = null;

  import { _, locale } from 'svelte-i18n';
  import { createEventDispatcher } from 'svelte';
  import { scale, fade } from 'svelte/transition';
  import { getPublicUserProfile } from '@/api/user';
  import { getGardenPhotoSmall, getGardenPhotoBig } from '@/api/garden';
  import { user } from '@/stores/auth';
  import { draggable, clickOutside } from '@/directives';
  import { Text, Badge, Image, Button, Progress } from '../UI';
  import {
    bonfireIcon,
    waterIcon,
    electricityIcon,
    showerIcon,
    tentIcon,
    toiletIcon
  } from '@/images/icons';
  import routes from '@/routes';

  const dispatch = createEventDispatcher();

  let drawerElement;
  let photoWrapper;
  let previousOffsetCursor = null;

  $: hasHiddenClass = garden ? '' : 'hidden';
  $: drawerClasses = `drawer ${hasHiddenClass}`;

  function dragBarCatch() {
    previousOffsetCursor = 0;
  }

  function dragBarMove({ detail }) {
    if (previousOffsetCursor !== null) {
      drawerElement.style.height = `${
        drawerElement.offsetHeight - previousOffsetCursor + detail.y
      }px`;
      previousOffsetCursor = detail.y;
    }
  }

  function dragBarRelease() {
    previousOffsetCursor = null;
  }

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

  let userInfo = {};
  let photoUrl = null;
  let biggerPhotoUrl = null;

  $: if (garden) {
    userInfo = {};
    photoUrl = null;
    biggerPhotoUrl = null;
  }
  let ready = false;
  const setAllGardenInfo = async () => {
    try {
      userInfo = await getPublicUserProfile(garden.id);
      if (garden.photo) {
        const id = garden.previousPhotoId || garden.id;
        photoUrl = await getGardenPhotoSmall({ ...garden, id });
      }
    } catch (ex) {
      console.log(ex);
      ready = true;
    }
  };

  const handleClickOutsideDrawer = (event) => {
    const { clickEvent } = event.detail;
    // if closing maginified photo view, don't close drawer
    if (isShowingMagnifiedPhoto && photoWrapper.contains(clickEvent.target)) return;
    // if showing/hiding trails, don't close drawer
    else if (
      (clickEvent.target instanceof HTMLInputElement && clickEvent.target.type == 'checkbox') ||
      clickEvent.target.tagName == 'LABEL'
    )
      return;
    else if (!drawerElement.contains(clickEvent.target)) dispatch('close');
  };

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
  };

  let previousGarden = {};
  $: if (garden && garden.id !== previousGarden.id) {
    ready = false;
    previousGarden = garden;
  }
  $: if (garden) setAllGardenInfo().then(() => (ready = true));
  $: ownedByLoggedInUser = $user && garden && $user.id === garden.id;
</script>

<Progress active={isGettingMagnifiedPhoto} />
{#if isShowingMagnifiedPhoto && !isGettingMagnifiedPhoto}
  <div
    class="magnified-photo-wrapper"
    transition:scale
    bind:this={photoWrapper}
    on:click={() => {
      isShowingMagnifiedPhoto = false;
    }}>
    <div class="magnified-photo">
      <img
        alt={$_('generics.garden')}
        src={biggerPhotoUrl}
        on:click={() => (isShowingMagnifiedPhoto = false)} />
    </div>
  </div>
{/if}

<div
  class={drawerClasses}
  bind:this={drawerElement}
  use:clickOutside
  on:click-outside={handleClickOutsideDrawer}>
  <div
    class="drag-area"
    use:draggable
    on:dragstart={dragBarCatch}
    on:drag={dragBarMove}
    on:dragend={dragBarRelease}>
    <div class="drag-bar" />
  </div>
  {#if ready}
    <section class="main">
      <Text class="mb-l" weight="bold" size="l">
        {#if ownedByLoggedInUser}
          {$_('garden.drawer.owner.your-garden')}
        {:else}{userInfo.firstName}{/if}
      </Text>
      {#if garden && garden.photo}
        <button on:click={magnifyPhoto} class="mb-l button-container image-container">
          {#if photoUrl}
            <div transition:fade>
              <Image src={photoUrl} />
            </div>
          {/if}
        </button>
      {/if}
      <div class="description">
        <Text class="mb-l">{garden && garden.description}</Text>
      </div>
      <div class="badges-container">
        {#each facilities as facility (facility.name)}
          {#if garden && garden.facilities[facility.name]}
            <Badge icon={facility.icon}>{facility.label}</Badge>
          {/if}
        {/each}
      </div>
      {#if garden && garden.facilities.capacity}
        <p class="mt-m capacity">
          {@html $_('garden.drawer.facilities.capacity', {
            values: {
              capacity: garden.facilities.capacity,
              styleCapacity: `<strong>${garden.facilities.capacity}</strong>`
            }
          })}
        </p>
      {/if}
    </section>
    <footer class="footer mt-m">
      {#if userInfo.languages}
        <Text class="mb-m">
          {userInfo.firstName} speaks
          <Text is="span" weight="bold">Dutch & English</Text>
        </Text>
      {/if}
      {#if garden && ownedByLoggedInUser}
        <Button href={routes.MANAGE_GARDEN} uppercase medium>
          {$_('garden.drawer.owner.button')}
        </Button>
      {:else if garden}
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
        {:else if garden.unclaimed}
          <p class="cta-hint">{$_('garden.drawer.unclaimed')}</p>
        {/if}
        <Button
          href={`${routes.CHAT}?with=${garden.id}`}
          disabled={!$user || garden.unclaimed}
          uppercase
          medium>
          {$_('garden.drawer.guest.button')}
        </Button>
      {/if}
    </footer>
  {:else}
    <section class="main">
      <div class="skeleton mb-l skeleton-name" />
      <div class="skeleton skeleton-photo" />
      <div class="description">
        <div class="skeleton skeleton-description" />
        <div class="skeleton skeleton-description" />
        <div class="skeleton skeleton-description" />
      </div>
      <div class="badges-container skeleton-badges">
        <Badge isSkeleton />
        <Badge isSkeleton />
        <Badge isSkeleton />
        <Badge isSkeleton />
        <Badge isSkeleton />
        <Badge isSkeleton />
      </div>
      <div class="skeleton footer mt-ms skeleton-cta" />
    </section>
  {/if}
</div>

<style>
  .drawer {
    position: absolute;
    font-family: var(--fonts-copy);
    top: 50%;
    right: 0;
    background-color: white;
    width: 38rem;
    min-height: 45rem;
    max-height: 80%;
    z-index: 200;
    transform: translate(0, -50%);
    padding: 3rem;
    box-sizing: border-box;
    border-top-left-radius: 1rem;
    border-bottom-left-radius: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    transition: right 250ms;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
  }

  .drawer.hidden {
    right: -38rem;
  }

  @media screen and (max-width: 700px) {
    .drawer {
      top: auto;
      right: auto;
      bottom: 0;
      transform: none;
      width: 100%;
      border-top-right-radius: 2rem;
      border-top-left-radius: 2rem;
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 0;
      min-height: auto;
      max-height: calc(var(--vh, 1vh) * 80);
      overflow-y: hidden;
      transition: transform 250ms;
    }
    .drawer.hidden {
      right: 0;
      transform: translateY(100rem);
    }
  }

  .drag-area {
    position: absolute;
    top: 0;
    left: 50%;
    padding: 2rem 2rem 1rem 2rem;
    transform: translateX(-50%);
    cursor: ns-resize;
  }

  @media screen and (min-width: 700px) {
    .drag-area {
      display: none;
    }
  }

  .drag-bar {
    width: 40px;
    height: 3px;
    background-color: var(--color-beige);
  }

  .main {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  @media screen and (min-width: 700px) {
    .main {
      min-height: 30rem;
    }
  }
  .footer {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .badges-container {
    display: flex;
    flex-wrap: wrap;
    /* Negative margin compensate the Badge components margins */
    margin-top: calc(0.8rem * -1);
    margin-left: calc(0.8rem * -1);
  }

  .description {
    max-width: 45rem;
    word-wrap: break-word;
  }

  .image-container {
    width: 6rem;
    height: 6rem;
    background-color: var(--color-beige);
    margin-bottom: 2rem;
    border-radius: 1rem;
  }

  .image-container > div {
    width: 100%;
    height: 100%;
  }

  .image-container:hover {
    cursor: zoom-in;
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

  .skeleton-name {
    width: 100%;
    height: 3rem;
  }
  .skeleton-photo {
    width: 6rem;
    height: 6rem;
    margin-bottom: 2rem;
  }
  .skeleton-description {
    height: 2rem;
    width: 100%;
    margin-bottom: 0.8rem;
  }
  .skeleton-badges {
    margin-top: 1rem;
    margin-bottom: 2rem;
    padding: 0 1rem;
  }
  .skeleton-cta {
    height: 5rem;
    width: 12rem;
    align-self: center;
    margin-top: auto;
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
