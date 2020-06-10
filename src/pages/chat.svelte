<script>
  import ConversationCard from '@/components/Chat/ConversationCard.svelte';

  const conversationData = {
    1: {
      id: 1,
      recipient: 'Dries',
      lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
    },
    2: {
      id: 2,
      recipient: 'Manon',
      lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
    },
    3: {
      id: 3,
      recipient: 'Marie',
      lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
    },
    4: {
      id: 4,
      recipient: 'Janneke',
      lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
    },
    5: {
      id: 5,
      recipient: 'Brent',
      lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
    },
    6: {
      id: 6,
      recipient: 'Brent',
      lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
    },
    7: {
      id: 7,
      recipient: 'Michiel',
      lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
    }
  };

  let selectedConversation = conversationData[1];
  const selectConversation = id => {
    selectedConversation = conversationData[id];
  };

  $: conversations = Object.keys(conversationData).map(id => conversationData[id]);
</script>

<div class="container">
  <section class="conversations">
    <h2>All conversations</h2>
    {#each conversations as conversation (conversation.id)}
      <ConversationCard
        {...conversation}
        selected={selectedConversation.id === conversation.id}
        on:click={() => selectConversation(conversation.id)} />
    {/each}
  </section>
  <div class="messages">
    <span />
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
    display: flex;
    margin: 0 auto;
  }

  .conversations {
    width: 40rem;
    box-shadow: 0px 0px 33px rgba(0, 0, 0, 0.1);
    border-radius: 0.6rem;
    margin-right: 4rem;
  }
</style>
