<script lang="ts">
  import { Icon } from '$lib/components/UI';
  import { archiveIcon } from '$lib/images/icons';

  interface Props {
    title: string;
    detail: string;
    actionLabel?: string;
    onaction?: () => void;
  }

  let { title, detail, actionLabel, onaction }: Props = $props();
</script>

<div class="empty">
  <span class="empty-icon" class:faded={!actionLabel}>
    <Icon icon={archiveIcon} />
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

  .empty-icon.faded {
    opacity: 0.5;
  }

  .empty-icon.faded :global(i) {
    width: 3rem;
    height: 3rem;
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
