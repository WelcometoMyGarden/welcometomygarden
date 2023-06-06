<script lang="ts">
  import { Button, Modal } from '$lib/components/UI';
  import MembershipPricing from './MembershipPricing.svelte';
  import { arrowRightIcon } from '$lib/images/icons';
  import IconButton from '$lib/components/UI/IconButton.svelte';
  import Img from '@zerodevx/svelte-img';
  import velotourImg from '$lib/assets/velotour-group.jpeg?run';
  import mapScreenImg from '$lib/assets/value-points/map-screenshot.png?run&width=480';
  import chatScreenImg from '$lib/assets/value-points/chat-screenshot.png?run&width=480';
  import communityScreenImg from '$lib/assets/value-points/community-screenshot.png?run&width=480';
  import type { ComponentProps } from 'svelte';
  import ValuePoint from './ValuePoint.svelte';
  type ValuePointProps = ComponentProps<ValuePoint>;

  export let show = false;
  let showMobilePricing = false;

  const valueProps: ValuePointProps[] = [
    {
      imgPath: mapScreenImg,
      titleBoldPart: 'Send free stay requests',
      titleRest: 'to all 5.000+ WTMG hosts on the map'
    },
    {
      imgPath: chatScreenImg,
      titleBoldPart: 'Make arrangements with hosts',
      titleRest: 'through the chat and get to meet new fantastic people.'
    },
    {
      imgPath: communityScreenImg,
      titleBoldPart: 'Access the WTMG Community',
      titleRest: 'where members can meet, share experiences and ask questions.'
    },
    {
      imgPath: undefined,
      titleBoldPart: 'Cover your part of the costs:',
      titleRest:
        'WTMG needs money in order to maintain a quality network and continue developing the platform.'
    },
    {
      imgPath: undefined,
      titleBoldPart: 'Keep WTMG ad-free, fully independent and member-supported:',
      titleRest: 'without the continued support of our community we cannot exist!'
    },
    {
      imgPath: undefined,
      titleBoldPart: 'Support the work',
      titleRest: 'of a dedicated team of four slow travel enthusiasts'
    }
  ];
</script>

<Modal
  bind:show
  closeButton={false}
  closeOnEsc={false}
  closeOnOuterClick={false}
  maxWidth="992px"
  radius
  center
  fullHeight
  shrinkableBody
  stickToBottom={false}
  nopadding={false}
  noInnerPadding
  ariaLabelledBy="subtitle title"
>
  <div slot="title" class="title" class:showMobilePricing>
    {#if showMobilePricing}
      <div class="back-arrow">
        <IconButton
          icon={arrowRightIcon}
          on:click={() => (showMobilePricing = false)}
          alt="Back to membership info"
        />
      </div>
    {:else}
      <!-- TODO: translate alt -->
      <Img class="header-img" src={velotourImg} alt="" />
      <div class="text-backdrop" />
      <!-- TODO translate both -->

      <span class="subtitle">Slow Travel with WTMG</span>
      <h2 class="main-title">Become a Member!</h2>
    {/if}
  </div>
  <div slot="body" class="body" class:showMobilePricing>
    <!-- TODO alt -->
    <div class="membership-content">
      <div class="value-props">
        <div class="main-content">
          <p>
            Staying at a WTMG host is free. Yet, to maintain and develop WTMG, we rely on a yearly
            membership to split costs fairly among all slow travellers. Join us today!
          </p>
          <h3>As a member you can...</h3>
          <ul>
            {#each valueProps as props}
              <ValuePoint {...props} />
            {/each}
          </ul>
        </div>
        <div class="mobile-continue">
          <Button centered uppercase orange arrow on:click={() => (showMobilePricing = true)}
            >Choose Membership</Button
          >
        </div>
      </div>
      <div class="pricing">
        <MembershipPricing condensed={true} />
      </div>
    </div>
  </div>
</Modal>

<style>
  p {
    line-height: 1.5;
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin: 1.5rem 0;
  }

  .title {
    /* TODO: maybe re-enable when the FAQ is selected? */
    /* display: flex;
    align-items: center;
    gap: 1rem; */
  }

  .title {
    width: 100%;
    height: 20rem;
    display: flex;
    flex-direction: column;
    justify-content: end;
    align-items: flex-start;
    position: relative;
    padding: 2rem;
  }

  .back-arrow {
    display: none;
  }
  .back-arrow :global(i) {
    transform: rotate(180deg);
    width: 2rem;
    height: 2rem;
  }

  .title :global(.header-img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 60%;
  }
  .title :global(picture),
  .text-backdrop {
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    z-index: 0;
  }

  .text-backdrop {
    background: radial-gradient(
      55.2% 70.33% at 17.39% 100%,
      rgb(65 52 42 / 57%) 38.76%,
      rgba(73, 87, 71, 0) 100%
    );
    /* warning by Figma: gradient uses a rotation that is not supported by CSS and may not behave as expected */
  }

  .title > span,
  h2 {
    z-index: 1;
    color: #fff;
  }

  span.subtitle {
    text-transform: uppercase;
    font-weight: 500;
    font-size: 2.5rem;
  }

  h2.main-title {
    font-family: var(--fonts-titles);
    font-weight: 700;
    font-size: 4rem;
    line-height: 1;
  }

  .body {
    height: 100%;
  }

  .membership-content {
    height: 100%;
    /* overflow-y: scroll; */
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .membership-content > div {
    min-height: 0;
    height: 100%;
    overflow-y: scroll;
  }

  .membership-content > .pricing,
  .main-content {
    padding: 2rem;
  }

  .value-props {
    background: var(--color-beige-light);
    position: relative;
  }

  h3 {
    font-size: 1.8rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  .pricing {
    display: flex;
    /* Can lead to weirdness with overflow */
    /* flex-direction: column;
    justify-content: center; */
  }

  .mobile-continue {
    display: none;
  }

  @media screen and (max-width: 700px) {
    .membership-content {
      display: block;
    }

    .pricing,
    .back-arrow {
      display: none;
    }

    .showMobilePricing .pricing,
    .showMobilePricing .back-arrow {
      display: block;
    }
    .showMobilePricing .value-props,
    .showMobilePricing .mobile-continue {
      display: none;
    }

    /* Make a non-scrollable nav bar, resetting other title properties */
    .showMobilePricing.title {
      height: min-content;
      align-items: flex-start;
      padding: 1.6rem 2rem 0rem 2rem;
    }

    .membership-content > div.pricing {
      padding-top: 0;
    }

    /* .membership-content > div.value-props {
      padding-bottom: 0;
    } */

    .value-props {
      display: grid;
      height: 100%;
      grid-template-rows: auto min-content;
    }
    .value-props > .main-content {
      /* Allow it to be smaller than its content, so it can be smaller  */
      min-height: 0;
      height: auto;
      overflow-y: scroll;
    }

    .mobile-continue {
      display: block;
      width: 100%;
      padding: 1.5rem;
      height: fit-content;
      background-color: var(--color-white);
      /* This makes it hide stuff below */
      /* but sticky results in some weird header scroll */

      /* position: absolute; */
      /* bottom: 0; */
    }
    .title {
      text-align: center;
      align-items: center;
      gap: 0.5rem;
      height: 16rem;
    }

    span.subtitle {
      font-size: 1.5rem;
    }
    h2.main-title {
      font-size: 2.5rem;
    }
  }
</style>
