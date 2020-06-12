<script>
  import { user } from '@/stores/auth';
  import { flip } from 'svelte/animate';
  import { goto, params } from '@sveltech/routify';
  import routes from '@/routes';
  import { initiateChat } from '@/api/chat';
  import { chats, creatingNewChat } from '@/stores/chat';
  import ConversationCard from '@/components/Chat/ConversationCard.svelte';
  import { Progress } from '@/components/UI';
  import { removeDiacritics } from '@/util';

  if (!$user) $goto(routes.SIGN_IN);

  $: selectedConversation = $chats[$params.chatId];
  $: conversations = Object.keys($chats)
    .map(id => $chats[id])
    .sort(sortByLastActivity);

  const getConvoRoute = (name, id) =>
    `${routes.CHAT}/${removeDiacritics(name).toLowerCase()}/${id}`;

  let newConversation;
  const startChattingWith = async partnerId => {
    try {
      const newPartner = await initiateChat(partnerId);
      newConversation = { name: newPartner.firstName, partnerId };
      $goto(getConvoRoute(newPartner.firstName, `new?id=${partnerId}`));
    } catch (ex) {
      // TODO: display error
      $goto(routes.CHAT);
    }
  };

  const sortByLastActivity = (c1, c2) => c1.lastActivity - c2.lastActivity;

  $: if ($params.with) startChattingWith($params.with);

  const selectConversation = id => {
    if (!id) $goto(getConvoRoute(newConversation.name, 'new'));
    const name = $chats[id].partner.firstName.toLowerCase();
    $goto(getConvoRoute(name, id));
  };
</script>

<Progress active={$creatingNewChat} />

{#if !$params.with}
  <div class="container">
    <section class="conversations">
      <h2>All conversations</h2>
      {#if newConversation}
        <article>
          <ConversationCard
            on:click={() => selectConversation(null)}
            recipient={newConversation.name}
            lastMessage={''}
            selected={$params.chatId === 'new'} />
        </article>
      {/if}
      {#if conversations.length === 0 && !newConversation}
        <div class="empty">
          You don't have any messages yet. Select a host
          <a href={routes.MAP}>on the map</a>
          to contact them.
        </div>
      {:else}
        {#each conversations as conversation (conversation.id)}
          <article animate:flip={{ duration: 400 }}>
            <ConversationCard
              recipient={$chats[conversation.id].partner.firstName}
              lastMessage={conversation.lastMessage}
              selected={selectedConversation && selectedConversation.id === conversation.id}
              on:click={() => selectConversation(conversation.id)} />
          </article>
        {/each}
      {/if}
    </section>
    <div class="messages">
      <slot />
    </div>
  </div>
{/if}

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
    height: 75vh;
  }

  .empty {
    padding: 1rem 3rem;
    line-height: 1.6;
  }

  .empty a {
    text-decoration: underline;
    color: var(--color-orange);
  }
  .conversations {
    width: 40rem;
    box-shadow: 0px 0px 33px rgba(0, 0, 0, 0.1);
    border-radius: 0.6rem;
    margin-right: 4rem;
    height: 100%;
    overflow-y: auto;
  }

  article {
    width: 100%;
  }

  .messages {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: calc(100% - 42rem);
  }

  @media screen and (max-width: 700px) {
    .container {
      height: 90vh;
    }
  }
</style>
