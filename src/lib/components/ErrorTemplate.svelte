<script lang="ts">
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import { Icon, Button } from '$lib/components/UI';
  import { binocularsIcon } from '$lib/images/icons';
  import { localeIsLoaded } from '$lib/stores/app';
  import Navigation from '$lib/components/Nav/Navigation.svelte';
  import { lr, type LocalizedMessage } from '$lib/util/translation-helpers';
  import type { Snippet } from 'svelte';

  interface Props {
    /** The (already localized) headline shown in the large error title. */
    title: LocalizedMessage | string;
    icon?: string | Object[];
    /**
     * Optional content rendered below the title. Defaults to a "back to home"
     * button when omitted. Use this to render follow-up actions for "planned"
     * (non-crash) error pages.
     */
    children?: Snippet;
  }

  let { title, children, icon = binocularsIcon }: Props = $props();
</script>

{#if $localeIsLoaded}
  <Navigation />
{/if}
<div class="available-space-container expand-70">
  <div class="fallback-container">
    <div class="icon" class:default-icon={icon === binocularsIcon}>
      <Icon {icon} greenStroke />
    </div>
    <h1>
      {#if typeof title === 'string'}
        {title}
      {:else if $localeIsLoaded}
        {$_(title.key)}
      {/if}
    </h1>
    {#if children}
      <div class="content">
        {@render children()}
      </div>
    {:else}
      <Button href={$lr(routes.HOME)} uppercase medium>
        {$localeIsLoaded ? $_('fallback.redirect') : 'Back to home'}
      </Button>
    {/if}
  </div>
</div>

<style>
  .available-space-container {
    height: 100%;
    display: flex;
    padding: var(--section-inner-padding);
  }

  .fallback-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  h1 {
    padding-top: 3rem;
    padding-bottom: 7rem;
    font-size: clamp(1.8rem, 0.1731rem + 4.5192vw, 6.5rem);
    font-weight: 700;
    text-transform: uppercase;
    font-family: var(--fonts-copy);
    text-align: center;
  }

  .content {
    padding-bottom: 7rem;
    max-width: 60rem;
    text-align: center;
    font-size: 1.6rem;
    line-height: 1.5;
  }

  .content :global(a) {
    text-decoration: underline;
    font-weight: 600;
  }

  .icon {
    width: 20rem;
  }

  /* The binocular icon should not be filled */
  .icon:not(.default-icon) :global(svg) {
    fill: var(--color-green);
  }

  @media only screen and (max-width: 700px) {
    .icon {
      width: 15rem;
    }
  }
</style>
