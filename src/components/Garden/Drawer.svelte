<script>
  export let garden = null;

  import { createEventDispatcher } from 'svelte';
  import { scale, fade } from 'svelte/transition';
  import { getPublicUserProfile } from '@/api/user';
  import { getGardenPhotoSmall, getGardenPhotoBig } from '@/api/garden';
  import { user } from '@/stores/auth';
  import { draggable, clickOutside } from '@/directives';
  import { Text, Badge, Image, Button } from '../UI';
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

  const DRAWER_DEFAULT_HEIGHT = 400;

  let drawerElement;
  let photoWrapper;
  let drawerHeight = DRAWER_DEFAULT_HEIGHT;
  let previousOffsetCursor = null;

  $: hasHiddenClass = garden ? '' : 'hidden';
  $: drawerClasses = `drawer ${hasHiddenClass}`;
  $: ownedByLoggedInUser = $user && garden && $user.id === garden.id;

  function dragBarCatch() {
    previousOffsetCursor = 0;
  }

  function dragBarMove({ detail }) {
    if (previousOffsetCursor !== null) {
      drawerHeight = drawerHeight - previousOffsetCursor + detail.y;
      previousOffsetCursor = detail.y;
    }
  }

  function dragBarRelease() {
    previousOffsetCursor = null;
  }

  const facilities = [
    { name: 'water', icon: waterIcon, label: 'Water' },
    { name: 'drinkableWater', icon: waterIcon, label: 'Drinkable water' },
    { name: 'toilet', icon: toiletIcon, label: 'Toilet' },
    { name: 'bonfire', icon: bonfireIcon, label: 'Bonfire' },
    { name: 'electricity', icon: electricityIcon, label: 'Electricity' },
    { name: 'shower', icon: showerIcon, label: 'Shower' },
    { name: 'tent', icon: tentIcon, label: 'Tent' }
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
      if (garden.photo) photoUrl = await getGardenPhotoSmall(garden);
    } catch (ex) {
      console.log(ex);
      ready = true;
    }
  };

  const handleClickOutsideDrawer = event => {
    const { clickEvent } = event.detail;
    if (isShowingMagnifiedPhoto && photoWrapper.contains(clickEvent.target)) return;
    else if (!drawerElement.contains(clickEvent.target)) dispatch('close');
  };

  let isShowingMagnifiedPhoto = false;
  const magnifyPhoto = async () => {
    try {
      if (garden.photo) {
        biggerPhotoUrl = await getGardenPhotoBig(garden);
      }
    } catch (ex) {
      console.log(ex);
      ready = true;
    }
    isShowingMagnifiedPhoto = true;
  };

  let previousGarden = garden;
  $: if (garden && garden.id !== previousGarden.id) {
    ready = false;
    previousGarden = garden;
  }
  $: if (garden) setAllGardenInfo().then(() => (ready = true));
</script>

{#if isShowingMagnifiedPhoto}
  <div
    class="magnified-photo-wrapper"
    transition:scale
    bind:this={photoWrapper}
    on:click={() => {
      isShowingMagnifiedPhoto = false;
    }}>
    <div class="magnified-photo">
      <img alt="Garden" src={biggerPhotoUrl} on:click={() => (isShowingMagnifiedPhoto = false)} />
    </div>
  </div>
{/if}

<div
  class={drawerClasses}
  bind:this={drawerElement}
  use:clickOutside
  on:click-outside={handleClickOutsideDrawer}
  style={`height: ${drawerHeight}px`}>
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
        {#if ownedByLoggedInUser}Your Garden{:else}{userInfo.firstName}{/if}
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
        <Text class="mb-l">{garden && garden.description.replace(/\n\s*\n\s*\n/g, '\n\n')}</Text>
      </div>
      <div class="badges-container">
        {#each facilities as facility (facility.name)}
          {#if garden && garden.facilities[facility.name]}
            <Badge icon={facility.icon}>{facility.label}</Badge>
          {/if}
        {/each}
      </div>
    </section>
    <footer class="footer mt-m">
      {#if userInfo.languages}
        <Text class="mb-m">
          {userInfo.firstName} speaks
          <Text is="span" weight="bold">Dutch & English</Text>
        </Text>
      {/if}
      {#if garden && ownedByLoggedInUser}
        <Button href={routes.ACCOUNT} uppercase medium>Manage garden</Button>
      {:else if garden}
        <Button href={`${routes.CHAT}?with=${garden.id}`} uppercase medium>Contact host</Button>
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
    width: 32.5rem;
    min-height: 48rem;
    max-height: 50rem;
    z-index: 1;
    transform: translate(0, -50%);
    padding: 3rem;
    box-sizing: border-box;
    border-top-left-radius: 1rem;
    border-bottom-left-radius: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    transition: right 250ms;
  }

  .drawer.hidden {
    right: -325px;
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
      overflow-y: hidden;
      transition: transform 250ms;
    }
    .drawer.hidden {
      right: 0;
      transform: translateY(1000px);
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
    white-space: pre-wrap;
  }

  .image-container {
    width: 6rem;
    height: 6rem;
    background-color: var(--color-beige);
    margin-bottom: 2rem;
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
    height: 100vh;
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
    max-height: 60vh;
    width: auto;
    height: 80vh;
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
    margin-bottom: 1rem;
  }
  .skeleton-badges {
    margin-bottom: 2rem;
  }
  .skeleton-cta {
    height: 5rem;
    width: 12rem;
    align-self: center;
    margin-top: auto;
  }
</style>
