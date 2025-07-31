<script lang="ts">
  import routes from '$lib/routes';
  import { isActive } from '$lib/util/isActive';
  import { page } from '$app/stores';
  const elementOptions = ['h1', 'h2', 'span'] as const;
  type Option = (typeof elementOptions)[number];
  export let is: Option = 'h1';
  export let hideTitleWhenOnHome = false;
</script>

<a href={routes.HOME} class="title" class:hide={hideTitleWhenOnHome}>
  <svelte:element this={is} class="inner notranslate">
    {#if !hideTitleWhenOnHome || !isActive($page, '/')}Welcome To My Garden{/if}
  </svelte:element>
</a>

<style>
  .title {
    display: flex;
    align-items: center;
    background-image: url(/images/logo-emblem.svg);
    background-repeat: no-repeat;
    background-position: left center;
    background-size: contain;
    height: 100%;
    max-height: 4.3rem;
  }

  .inner {
    padding-left: 8.5rem;
    font-size: 2.3rem;
    font-weight: 700;
    font-family: var(--fonts-titles);
  }

  @media screen and (max-width: 1300px) {
    .title {
      padding-left: 6rem;
    }

    .inner {
      font-size: 2rem;
      padding-left: 2rem;
    }
  }

  @media screen and (max-width: 1200px) {
    .inner {
      display: none;
    }
  }
</style>
