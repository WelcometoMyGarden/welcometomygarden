<script lang="ts">
  import { fade } from 'svelte/transition';
  import { Icon } from '$lib/components/UI';
  import { EMPTY_FADE_DURATION } from './_shared';

  interface Props {
    title: string;
    detail: string;
    icon: string | Object[];
    actionLabel?: string;
    onaction?: () => void;
    /** Fade duration (ms). The parent shortens this during a view switch. */
    duration?: number;
  }

  let {
    title,
    detail,
    actionLabel,
    icon,
    onaction,
    duration = EMPTY_FADE_DURATION
  }: Props = $props();
</script>

<!-- This needs a global transition, since the insertion/removal of this component
 is controlled by an ancestral `conversations.length === 0` condition, not by an
 immediately containing $isArchivedView block -->
<div class="empty" transition:fade|global={{ duration }}>
  <span class="empty-icon">
    <Icon {icon} />
  </span>
  <p class="empty-title">{title}</p>
  <p class="empty-detail">{detail}</p>
  {#if actionLabel}
    <button class="empty-action" onclick={onaction}>{actionLabel}</button>
  {/if}
</div>

<style>
  .empty {
    padding: 3rem 2.4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
    color: var(--color-green);
  }

  .empty-icon {
    display: inline-flex;
    margin-bottom: 0.6rem;
  }

  .empty-icon :global(i) {
    width: 4rem;
    height: 4rem;
  }

  .empty-title {
    font-weight: 600;
    font-size: 1.5rem;
  }

  .empty-detail {
    color: var(--color-darker-gray);
    font-size: 1.4rem;
    line-height: 1.6;
  }

  .empty-action {
    margin-top: 0.6rem;
    padding: 1rem 2rem;
    border-radius: 10rem;
    border: 1.5px solid var(--color-green);
    background: none;
    color: var(--color-green);
    font: 500 1.4rem / 1 var(--fonts-copy);
    cursor: pointer;
    transition:
      background 150ms,
      color 150ms;
  }

  .empty-action:hover {
    background: var(--color-green);
    color: var(--color-white);
  }
</style>
