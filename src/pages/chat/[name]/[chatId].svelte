<script>
  export let chatId;

  import { params, goto } from '@sveltech/routify';
  import { observeMessagesForChat, create as createChat } from '@/api/chat';
  import { user } from '@/stores/auth';
  import { chats } from '@/stores/chat';
  import { Avatar } from '@/components/UI';
  import routes from '@/routes';

  let typedMessage = '';

  const isNew = chatId === 'new';

  const sortBySentDate = (m1, m2) => m1.createdAt - m2.createdAt;

  $: chat = $chats[chatId];

  $: if (chat && !chat.messages) observeMessagesForChat(chat.id);

  $: messages = chat && chat.messages ? chat.messages.sort(sortBySentDate).reverse() : [];

  let isSending = false;
  const sendMessage = async () => {
    // TODO: make sure typedMessage is below or equal to 500 characters
    isSending = true;
    if (!chat) {
      try {
        const newChatId = await createChat($user.id, $params.id, typedMessage);
        typedMessage = '';
        $goto(`${routes.CHAT}/${$params.name}/${newChatId}`);
      } catch (ex) {
        // TODO: show error
        console.log(ex);
      }
    } else {
      try {
        await sendMessage(chat.id, typedMessage);
        typedMessage = '';
      } catch (ex) {
        // TODO: show error
        console.log(ex);
      }
    }
    isSending = false;
  };
</script>

<div class="messages">
  {#each messages as message (message.id)}
    <div class="message" class:by-user={message.from === $user.id}>
      <div class="avatar">
        <Avatar name={message.from === $user.id ? $user.firstName : chat.partner.firstName} />
      </div>
      <p class="message-text">{message.content}</p>
    </div>
  {/each}
</div>
<form on:submit|preventDefault={sendMessage}>
  <textarea
    placeholder="Type your message..."
    type="text"
    name="message"
    bind:value={typedMessage}
    disabled={isSending} />
  <button type="submit" disabled={isSending} aria-label="Send message">Send message &#62;</button>
</form>

<style>
  .messages {
    flex: 0.92;
    width: 100%;
    position: relative;
    padding: 0 0 4rem 0;
    display: flex;
    flex-direction: column-reverse;
  }

  .avatar {
    align-self: flex-end;
  }

  .message {
    display: flex;
    align-items: center;
  }

  .message.by-user {
    align-self: flex-end;
    flex-flow: row-reverse;
  }

  .message-text {
    margin-left: 2rem;
    white-space: pre-wrap;
    padding: 1.2rem;
    background-color: var(--color-gray);
    border-radius: 1rem;
  }

  .message.by-user .message-text {
    margin-left: 0;
    margin-right: 2rem;
    background-color: var(--color-green-light);
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
    flex: 0.92;
    resize: vertical;
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
