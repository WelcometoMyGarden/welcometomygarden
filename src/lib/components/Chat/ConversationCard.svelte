<script lang="ts">
  import { _ } from 'svelte-i18n';
  import User from './User.svelte';
  interface Props {
    selected?: boolean;
    recipient: string;
    seen?: boolean;
    lastMessage: string | undefined;
    onclick: () => void;
  }

  let { selected = false, recipient, seen = true, lastMessage, onclick }: Props = $props();
</script>

<button class="button-container conversation" class:selected {onclick}>
  <User name={recipient} {seen}>
    <p class="last-message" class:notranslate={true} class:seen>
      {#if lastMessage}
        {lastMessage}
      {:else}
        <span class="badge">{$_('chat.new')}</span>
      {/if}
    </p>
  </User>
</button>

<style>
  .conversation {
    padding: 2rem 2.4rem 2rem 2rem;
    background-color: var(--color-white);
    border-left: 0.3rem solid var(--color-white);
    transition: all 0.3s ease-in-out;
  }

  .conversation:hover,
  .conversation.selected {
    background-color: var(--color-green-light);
  }

  .conversation:hover {
    border-left: 0.3rem solid var(--color-green-light);
  }

  .conversation.selected {
    border-left: 0.3rem solid var(--color-green);
  }

  .conversation :global(.details) {
    width: 75%;
  }

  /* truncate on overflow */
  .last-message {
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 1.4rem;
    margin-top: 0.4rem;
    font-weight: 500;
    color: var(--color-copy);
  }

  .last-message.seen {
    font-weight: 400;
  }

  .badge {
    background-color: var(--color-green);
    border-radius: 0.6rem;
    display: block;
    color: var(--color-white);
    padding: 0.4rem 0.8rem;
    font-size: 1.2rem;
    font-weight: bold;
    text-transform: uppercase;
    display: inline-flex;
  }

  @media (min-width: 701px) and (max-width: 850px) {
    .conversation {
      padding: 1rem 1.4rem;
    }
  }
</style>
