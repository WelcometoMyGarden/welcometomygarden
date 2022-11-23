<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import { user } from '@/lib/stores/auth';
  import notify from '$lib/stores/notification';
  import { chats, creatingNewChat, hasInitialized, getChatForUser } from '$lib/stores/chat';
  import routes from '$lib/routes';
  import { initiateChat } from '$lib/api/chat';
  import ConversationCard from '$lib/components/Chat/ConversationCard.svelte';
  import { Progress } from '$lib/components/UI';
  import { removeDiacritics } from '$lib/util';
  import { onMount } from 'svelte';

  let localPage = $page;
  // Subscribe to page is necessary to render the chat page of the selected chat (when the url changes) for mobile
  page.subscribe((currentPage) => (localPage = currentPage));

  $: selectedConversation = $chats[localPage.params.chatId];

  $: conversations = Object.keys($chats)
    .map((id) => $chats[id])
    .sort(sortByLastActivity);

  let newConversation;

  $: if (
    newConversation &&
    selectedConversation &&
    selectedConversation.users &&
    selectedConversation.users.includes(newConversation.partnerId)
  ) {
    newConversation = null;
  }

  $: isOverview = localPage.url.pathname == '/chat';

  let outerWidth;
  let isMobile = false;
  $: outerWidth <= 700 ? (isMobile = true) : (isMobile = false);

  onMount(() => {
    if (!$user) {
      return goto(routes.SIGN_IN);
    } else if (!$user.emailVerified) {
      notify.warning($_('chat.notify.unverified'), 10000);
      return goto(routes.ACCOUNT);
    }

    if (localPage.url.searchParams.get('with')) {
      startChattingWith(localPage.url.searchParams.get('with'));
    }
  });

  // Functions
  const sortByLastActivity = (c1, c2) => c2.lastActivity - c1.lastActivity;

  const getConvoRoute = (name, id) => `${routes.CHAT}/${normalizeName(name)}/${id}`;

  const normalizeName = (name: string) => {
    const parts = name.split(/[^A-Za-z-]/);
    return removeDiacritics(parts[0]).toLowerCase();
  };

  const startChattingWith = async (partnerId) => {
    if ($chats) {
      const activeChatWithUser = getChatForUser(partnerId);
      if (activeChatWithUser) {
        return goto(
          getConvoRoute($chats[activeChatWithUser].partner.firstName, activeChatWithUser)
        );
      }
      try {
        const newPartner = await initiateChat(partnerId);
        newConversation = { name: newPartner.firstName, partnerId };
        goto(getConvoRoute(newPartner.firstName, `new?id=${partnerId}`));
      } catch (ex) {
        // TODO: display error
        goto(routes.CHAT);
      }
    }
  };

  const selectConversation = (id) => {
    if (!id) goto(getConvoRoute(newConversation.name, 'new'));
    const name = $chats[id] ? $chats[id].partner.firstName.toLowerCase() : newConversation.name;
    goto(getConvoRoute(name, id));
  };
</script>

<svelte:window bind:outerWidth />
<Progress active={!$hasInitialized || $creatingNewChat} />

{#if !localPage.url.searchParams.get('with') && $hasInitialized}
  <div class="container">
    {#if !isMobile || (isMobile && isOverview)}
      <section class="conversations" in:fly={{ x: -outerWidth, duration: 400 }}>
        <h2>{$_('chat.all-conversations')}</h2>
        {#if newConversation}
          <article>
            <ConversationCard
              on:click={() => selectConversation(null)}
              recipient={newConversation.name}
              lastMessage={''}
              selected={localPage.params.chatId === 'new'}
            />
          </article>
        {/if}
        {#if $hasInitialized && conversations.length === 0 && !newConversation}
          <div class="empty">
            {@html $_('chat.no-messages.text', {
              values: {
                link: `<a class="link" href="${routes.MAP}">${$_('chat.no-messages.link')}</a>`
              }
            })}
          </div>
        {:else}
          {#each conversations as conversation (conversation.id)}
            <article animate:flip={{ duration: 400 }}>
              <ConversationCard
                recipient={$chats[conversation.id].partner.firstName}
                lastMessage={conversation.lastMessage}
                selected={selectedConversation && selectedConversation.id === conversation.id}
                on:click={() => selectConversation(conversation.id)}
              />
            </article>
          {/each}
        {/if}
      </section>
    {/if}
    {#if !isMobile || (isMobile && !isOverview)}
      <div class="messages" in:fly={{ x: outerWidth, duration: 400 }}>
        <slot />
      </div>
    {/if}
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
    height: calc(var(--vh, 1vh) * 72);
  }

  .empty {
    padding: 1rem 3rem;
    line-height: 1.6;
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

  @media screen and (max-width: 850px) {
    .container {
      font-size: 1.4rem;
    }
    .conversations {
      font-size: 1.4rem;
      width: 30rem;
    }
    .messages {
      width: calc(100% - 32rem);
    }
  }

  @media screen and (max-width: 700px) {
    .container {
      width: 100%;
      height: calc(calc(var(--vh, 1vh) * 100) - var(--height-nav));
      padding: 0;
    }

    .conversations {
      width: 100%;
      border-radius: 0;
      margin-right: 0;
      box-shadow: 0;
      height: 100%;
      overflow-y: auto;
      flex-direction: column;
    }

    .messages {
      width: 100%;
      padding: 2rem;
      position: relative;
    }
  }
</style>