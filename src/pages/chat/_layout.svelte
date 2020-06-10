<script>
  import { user } from '@/stores/auth';
  import { flip } from 'svelte/animate';
  import { goto, params } from '@sveltech/routify';
  import routes from '@/routes';
  import { conversationData } from '@/stores/chat';
  import ConversationCard from '@/components/Chat/ConversationCard.svelte';
  import { removeDiacritics } from '@/util';

  if (!$user) $goto(routes.SIGN_IN);

  $: conversations = Object.keys($conversationData)
    .map(id => $conversationData[id])
    .sort((c1, c2) => c1.lastActivity - c2.lastActivity);

  $: selectedConversation = $conversationData[$params.id] || $conversationData[1];
  const selectConversation = id => {
    const name = $conversationData[id].recipient.toLowerCase();
    $goto(`${routes.CHAT}/${removeDiacritics(name)}/${id}`);
  };
</script>

<div class="container">
  <section class="conversations">
    <h2>All conversations</h2>
    {#each conversations as conversation (conversation.id)}
      <div animate:flip={{ duration: 400 }}>
        <ConversationCard
          recipient={conversation.recipient}
          lastMessage={conversation.lastMessage}
          selected={selectedConversation.id === conversation.id}
          on:click={() => selectConversation(conversation.id)} />
      </div>
    {/each}
  </section>
  <div class="messages">
    <slot />
  </div>
</div>

<style>
  h2 {
    font-family: var(--fonts-copy);
    font-size: 2.2rem;
    font-weight: 900;
    padding: 3rem;
  }

  .container {
    max-width: 120rem;
    width: 100%;
    padding: 5rem 2rem;
    display: flex;
    margin: 0 auto;
  }

  .conversations {
    width: 40rem;
    box-shadow: 0px 0px 33px rgba(0, 0, 0, 0.1);
    border-radius: 0.6rem;
    margin-right: 4rem;
    height: 65vh;
    overflow-y: auto;
  }

  @media screen and (max-width: 700px) {
    .conversations {
      height: 80vh;
    }
  }
</style>
