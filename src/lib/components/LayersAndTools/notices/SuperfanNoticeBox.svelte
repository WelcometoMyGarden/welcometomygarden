<script lang="ts">
  import { Text } from '$lib/components/UI';
  import { fly } from 'svelte/transition';
  import { _ } from 'svelte-i18n';
  import Icon from '$lib/components/UI/Icon.svelte';
  import routes from '$lib/routes';
  import { bookmarkIcon, crossIcon, routesIcon, trainIcon } from '$lib/images/icons';

  export let isOpen: boolean;
  export let isMobile: boolean;
  export let onToggle: () => void;
</script>

{#if isOpen && !isMobile}
  <!-- out:fly|local={{ x: -260, duration: 2000 }} -->
  <div class="layers-and-tools-visitors-superfan" in:fly={{ x: -260, duration: 2000 }}>
    <button
      class="button-container layers-and-tools-visitors-close"
      on:click|preventDefault|stopPropagation={onToggle}
    >
      <Icon icon={crossIcon} />
    </button>
    <div class="title">
      <div class="text">
        <Text size="m" weight="bold">{$_('map.superfan-notice.title')}</Text>
      </div>
      <span />
    </div>
    <div>
      <Text size="m" weight="thin">
        {@html $_('map.superfan-notice.description', {
          values: {
            linkText: `<a class="underline" href="${routes.BECOME_MEMBER}">${$_(
              'map.superfan-notice.linkText'
            )}`
          }
        })}
      </Text>
    </div>
  </div>
{:else}
  <button
    class="button-container layers-and-tools-visitors-icons"
    on:click|preventDefault|stopPropagation={onToggle}
  >
    <Icon icon={trainIcon} />
    <Icon icon={bookmarkIcon} />
    <Icon icon={routesIcon} />
  </button>
{/if}

<style>
  .layers-and-tools-visitors-close {
    position: absolute;
    top: 0;
    right: 0;
    padding: 0.5rem;
    cursor: pointer;
    width: 3rem;
    height: 3rem;
  }

  .layers-and-tools-visitors-superfan {
    background-color: var(--color-superfan-yellow);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    z-index: 9;
    position: relative;
  }

  .layers-and-tools-visitors-superfan .title {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: flex-start;
  }

  .layers-and-tools-visitors-superfan :global(.text) {
    max-width: 27rem;
  }

  .layers-and-tools-visitors-icons {
    background-color: var(--color-superfan-yellow);

    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    padding: 0.8rem;
  }

  .layers-and-tools-visitors-icons :global(i) {
    flex-grow: 1;
    width: 1.4rem;
    height: 1.4rem;
    margin: 0.4rem 0;
  }
</style>
