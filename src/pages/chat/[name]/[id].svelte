<script>
  export const id = '';

  import { params } from '@sveltech/routify';

  let typedMessage = '';

  const messages = [];
  const chatPartner = 'Barry';

  $: isNew = $params.new;

  const sendMessage = () => {
    console.log(typedMessage);
    typedMessage = '';
  };
</script>

<div class="messages">
  {#if messages.length === 0}
    <p class="empty-state">You and {chatPartner} have no messages.</p>
  {:else}
    <span />
  {/if}
</div>
<form on:submit|preventDefault={sendMessage}>
  <textarea
    placeholder="Type your message..."
    type="text"
    name="message"
    bind:value={typedMessage} />
  <button type="submit" aria-label="Send message">Send message &#62;</button>
</form>

<style>
  .messages {
    flex: 0.92;
    width: 100%;
    position: relative;
    padding: 1rem 0;
  }

  .empty-state {
    bottom: 1rem;
    left: 0;
    position: absolute;
  }

  form {
    flex: 0.08;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: 100%;
  }

  textarea {
    background-color: rgba(187, 187, 187, 0.23);
    padding: 1rem;
    border: 1px solid transparent;
    border-radius: 0.6rem;
    flex: 0.9;
  }

  textarea:focus {
    border: 1px solid var(--color-green);
  }

  form button {
    background-color: var(--color-green);
    font-size: 1.8rem;
    color: var(--color-white);
    border: 0;
    padding: 1rem;
    border-radius: 0.5rem;
    outline: 0;
  }
</style>
