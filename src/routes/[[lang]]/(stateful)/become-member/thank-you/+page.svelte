<script>
  import { _ } from 'svelte-i18n';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import MarketingBlock from '$lib/components/Marketing/MarketingBlock.svelte';
  import { Button } from '$lib/components/UI';
  import routes from '$lib/routes';
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
  <title>{$_('generics.wtmg.explicit')}</title>
</svelte:head>

<div class="wrapper">
  <PaddedSection desktopOnly>
    <MarketingBlock backgroundColor="var(--color-beige-light)" centered>
      <div class="inner">
        <h1 class="mh2">{$_('thank-you-superfan.top-section.title')}</h1>
        <div class="description">{@html $_('thank-you-superfan.top-section.description')}</div>
        <div class="features">{@html $_('thank-you-superfan.top-section.features')}</div>
        <div class="outro">{@html $_('thank-you-superfan.top-section.outro')}</div>
        <div class="button">
          <Button href={routes.MAP} uppercase orange arrow
            >{$_('thank-you-superfan.features-section.explore-features-button')}</Button
          >
        </div>
        <div class="closing-section">{@html $_('thank-you-superfan.closing-section.text')}</div>
      </div>
    </MarketingBlock>
  </PaddedSection>
</div>

<style>
  .inner {
    /* font-size: 2rem;
    line-height: 1.7; */
    max-width: 500px;
    margin: auto;
  }

  .features :global(p:first-child) {
    text-decoration: underline;
  }

  .wrapper .inner :global(p),
  .wrapper .inner :global(ul) {
    margin-bottom: 1rem;
  }
  .wrapper .inner .features,
  .wrapper .inner .description,
  .wrapper .inner .outro {
    text-align: left;
  }
  .button {
    width: 100%;
  }
  .button > :global(*) {
    margin: auto;
    margin-top: 2rem;
    margin-bottom: 3rem;
  }
  .wrapper .inner .features :global(ul) {
    list-style-type: disc;
    list-style-position: inside;
  }

  .closing-section :global(em) {
    font-style: italic;
  }
</style>
