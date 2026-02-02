<script lang="ts">
  import backgroundImg from '$lib/assets/background.png?as=run';
  import Img from '@zerodevx/svelte-img';
  import PaddedSection from './PaddedSection.svelte';
  import { playIcon } from '$lib/images/icons';
  import { Icon } from '../UI';
  import Heading from './Heading.svelte';
  import { rootModal } from '$lib/stores/app';
  import CommunityVideoModal from './CommunityVideoModal.svelte';
  import { trackEvent } from '$lib/util';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { _ } from 'svelte-i18n';
</script>

<PaddedSection id="community-video">
  <Heading centered>{$_('index.video-title')}</Heading>
  <div class="community-video">
    <Img class="bg-img" src={backgroundImg}></Img>
    <button
      class="overlay"
      onclick={() => {
        $rootModal = CommunityVideoModal;
        trackEvent(PlausibleEvent.SHOW_COMMUNITY_VIDEO);
      }}
    >
      <div class="controls">
        <Icon icon={playIcon}></Icon>
      </div>
    </button>
  </div>
</PaddedSection>

<style>
  .community-video {
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: var(--marketing-block-border-radius);
    overflow: hidden;
    position: relative;
  }

  .community-video :global(.bg-img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: hsl(0 0% 0% / 8%);

    /* reset button styles */
    font-family: inherit;
    font-size: inherit;
    text-align: start;
    line-height: 1;
    border: none;
    color: inherit;
  }

  .controls:hover {
    transform: scale(1.04);
    transition: ease-out 0.2s;
  }

  .controls {
    display: flex;
    align-items: center;
    display: flex;
    width: 8rem;
    height: 8rem;
    justify-content: center;
    align-items: center;
    background-color: var(--color-beige-light);
    border-radius: 50%;
    overflow: hidden;
  }
  .controls :global(i) {
    width: 45%;
    height: 45%;
  }
  .controls :global(svg) {
    fill: var(--color-green);
  }
</style>
