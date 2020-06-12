<script>
  export let selected = false;
  export let recipient;
  export let lastMessage;

  import { Avatar } from '@/components/UI';
</script>

<button class="button-container conversation" class:selected on:click>
  <Avatar name={recipient} />
  <div class="details">
    <span class="name">{recipient}</span>
    <p class="last-message">
      {#if lastMessage}
        {lastMessage}
      {:else}
        <span class="badge">New</span>
      {/if}
    </p>
  </div>
</button>

<style>
  .conversation {
    padding: 2rem 2.4rem;
    display: flex;
    align-items: center;
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

  .details {
    width: 80%;
    margin-left: 1.2rem;
  }

  .name {
    font-weight: 700;
  }

  /* truncate on overflow */
  .last-message {
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 1.4rem;
    margin-top: 0.4rem;
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
</style>
