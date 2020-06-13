<script>
  import Text from '../UI/Text.svelte';
  import Badge from '../UI/Badge.svelte';
  import Image from '../UI/Image.svelte';
  import Button from '../UI/Button.svelte';

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

  const badges = [
    { icon: 'tint', text: 'Drinkable water' },
    { icon: 'bolt', text: 'Electricity' },
    { icon: 'campfire', text: 'Bonfire' }
  ];
</script>

<section class="drawer">
  <div class="drag-bar" />
  <main class="main">
    <Text class="mb-l" weight="bold" size="l">Merelbeke</Text>
    <div class="mb-l">
      {#each images as image}
        <Image src={image.src} alt={image.alt} style={image.style} />
      {/each}
    </div>
    <Text class="mb-l">
      Quiet location, large garden, child friendly, meadow with animals, no sanitary facilities,
      toilet by arrangement with the owner.
    </Text>
    <div class="badges-container">
      {#each badges as badge}
        <Badge icon={badge.icon}>{badge.text}</Badge>
      {/each}
    </div>
  </main>
  <footer class="footer mt-m">
    <Text class="mb-m">
      Marie speaks
      <Text is="span" weight="bold">Dutch & English</Text>
    </Text>
    <Button capitalize={true}>Contact host</Button>
  </footer>
</section>

<style>
  .drawer {
    position: absolute;
    top: 50%;
    right: 0;
    background-color: white;
    width: 325px;
    min-height: 480px;
    max-height: 500px;
    z-index: 1;
    transform: translate(0, -50%);
    padding: var(--spacer-xl);
    box-sizing: border-box;
    border-top-left-radius: var(--radius-m);
    border-bottom-left-radius: var(--radius-m);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  @media screen and (max-width: 568px) {
    .drawer {
      top: auto;
      right: auto;
      bottom: 0;
      transform: none;
      width: 100%;
      border-top-right-radius: var(--radius-m);
      border-bottom-left-radius: 0;
      min-height: auto;
    }
  }

  .drag-bar {
    position: absolute;
    top: 20px;
    left: 50%;
    width: 40px;
    height: 3px;
    background-color: var(--color-beige);
    transform: translateX(-50%);
  }

  @media screen and (min-width: 700px) {
    .drag-bar {
      display: none;
    }
  }

  .main {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
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
    margin-top: -var(--spacer-s);
    margin-left: -var(--spacer-s);
  }
</style>
