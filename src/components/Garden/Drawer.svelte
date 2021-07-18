<script>
  export let garden = null;

  import { createEventDispatcher } from 'svelte';
  import { scale } from 'svelte/transition';
  import { _ } from 'svelte-i18n';
  import SkeletonDrawer from './SkeletonDrawer.svelte';
  import { getPublicUserProfile } from '@/api/user';
  import { getGardenPhotoSmall, getGardenPhotoBig } from '@/api/garden';
  import { user } from '@/stores/auth';
  import { clickOutside } from '@/directives';
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
  let photoWrapper;
  let userInfo = null;
  let photoUrl = null;
  let biggerPhotoUrl = null;
  let infoHasLoaded = false;

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
  }

  $: ownedByLoggedInUser = $user && garden && $user.id === garden.id;

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
</script>

<Progress active={isGettingMagnifiedPhoto} />
{#if isShowingMagnifiedPhoto && !isGettingMagnifiedPhoto}
  <div
    class="magnified-photo-wrapper"
    transition:scale
    bind:this={photoWrapper}
    on:click={() => {
      isShowingMagnifiedPhoto = false;
    }}
  >
    <div class="magnified-photo">
      <img
        alt={$_('generics.garden')}
        src={biggerPhotoUrl}
        on:click={() => (isShowingMagnifiedPhoto = false)}
      />
    </div>
  </div>
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
        <Text class="mb-l" weight="bold" size="l">
          {#if ownedByLoggedInUser}
            {$_('garden.drawer.owner.your-garden')}
          {:else}{userInfo.firstName}{/if}
        </Text>
        {#if garden.photo}
          <button on:click={magnifyPhoto} class="mb-l button-container image-wrapper">
            {#if photoUrl}
              <Image src={photoUrl} />
            {/if}
          </button>
        {/if}
      </header>
      <div class="drawer-content-area">
        <div class="description">
          <Text class="mb-l">{garden.description}</Text>
        </div>
        <div class="badges-container">
          {#each facilities as facility (facility.name)}
            {#if garden.facilities[facility.name]}
              <Badge icon={facility.icon}>{facility.label}</Badge>
            {/if}
          {/each}
        </div>
        {#if garden.facilities.capacity}
          <p class="mt-m capacity">
            {@html $_('garden.drawer.facilities.capacity', {
              values: {
                capacity: garden.facilities.capacity,
                styleCapacity: `<strong>${garden.facilities.capacity}</strong>`
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
          {:else if garden.unclaimed}
            <p class="cta-hint">{$_('garden.drawer.unclaimed')}</p>
          {/if}
          <Button
            href={`${routes.CHAT}?with=${garden.id}`}
            disabled={!$user || garden.unclaimed}
            uppercase
            medium
          >
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
    .image-wrapper {
      position: absolute;
      top: 1.5rem;
      right: 3rem;
      margin-bottom: 0;
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
      margin-top: 1.2rem;
    }

    .image-wrapper {
      position: absolute;
      top: 1.5rem;
      right: 3rem;
      margin-bottom: 0;
    }
  }

  .badges-container {
    display: flex;
    flex-wrap: wrap;
    /* Negative margin compensate the Badge components margins */
    margin-top: calc(0.8rem * -1);
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
