<script>
  import { draggable } from '../../directives/draggable.js';
  import Text from '../UI/Text.svelte';
  import Badge from '../UI/Badge.svelte';
  import Image from '../UI/Image.svelte';
  import Button from '../UI/Button.svelte';
  import {
    bonfireIcon,
    waterIcon,
    electricityIcon,
    showerIcon,
    tentIcon,
    toiletIcon
  } from '@/images/icons';

  const DRAWER_DEFAULT_HEIGHT = 400;
  const images = [
    {
      src: 'https://picsum.photos/200/200?1',
      alt: 'Random Image',
      style: 'width: 60px; height: 60px; margin-right: 5px;'
    },
    {
      src: 'https://picsum.photos/200/200?2',
      alt: 'Random Image',
      style: 'width: 60px; height: 60px; margin-right: 5px;'
    },
    {
      src: 'https://picsum.photos/200/200?3',
      alt: 'Random Image',
      style: 'width: 60px; height: 60px; margin-right: 5px;'
    },
    {
      src: 'https://picsum.photos/200/200?4',
      alt: 'Random Image',
      style: 'width: 60px; height: 60px; margin-right: 5px;'
    }
  ];

  export let campsite = null;

  let drawerElement;
  let drawerHeight = DRAWER_DEFAULT_HEIGHT;
  let previousOffsetCursor = null;
  $: hasHiddenClass = campsite ? '' : 'hidden';
  $: drawerClasses = `drawer ${hasHiddenClass}`;

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
</script>

<section class={drawerClasses} bind:this={drawerElement} style={`height: ${drawerHeight}px`}>
  <div
    class="drag-area"
    use:draggable
    on:dragstart={dragBarCatch}
    on:drag={dragBarMove}
    on:dragend={dragBarRelease}>
    <div class="drag-bar" />
  </div>
  <main class="main">
    <Text class="mb-l" weight="bold" size="l">Merelbeke</Text>
    <div class="mb-l">
      {#if campsite && campsite.photos.length}
        {#each campsite.photos as photo}
          <Image
            src={photo}
            alt="Random Image"
            style="width: 60px; height: 60px; margin-right: 5px;" />
        {/each}
      {/if}
    </div>
    <Text class="mb-l description">{campsite && campsite.description}</Text>
    <div class="badges-container">
      {#each facilities as facility (facility.name)}
        {#if campsite && campsite.facilities[facility.name]}
          <Badge icon={facility.icon}>{facility.label}</Badge>
        {/if}
      {/each}
    </div>
  </main>
  <footer class="footer mt-m">
    <Text class="mb-m">
      Marie speaks
      <Text is="span" weight="bold">Dutch & English</Text>
    </Text>
    <Button uppercase medium>Contact host</Button>
  </footer>
</section>

<style>
  .drawer {
    position: absolute;
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
    transition: right 0.3s;
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
      transition: transform 0.2s;
    }
    .drawer.hidden {
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
    max-width: 60rem;
  }
</style>
