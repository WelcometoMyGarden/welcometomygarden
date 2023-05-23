<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import { getUser, user } from '$lib/stores/auth';
  import { chats, creatingNewChat, hasInitialized } from '$lib/stores/chat';
  import routes from '$lib/routes';
  import ConversationCard from '$lib/components/Chat/ConversationCard.svelte';
  import { Progress } from '$lib/components/UI';
  import { onMount } from 'svelte';
  import { checkAndHandleUnverified } from '$lib/api/auth';
  import { onDestroy } from 'svelte';
  import nProgress from 'nprogress';
  import type { LocalChat } from '$lib/types/Chat';
  import { getConvoRoute, newConversation } from './shared';

  let localPage = $page;
  // Subscribe to page is necessary to render the chat page of the selected chat (when the url changes) for mobile
  const unsubscribeFromPage = page.subscribe((currentPage) => (localPage = currentPage));

  let selectedConversation: LocalChat | null = null;
  $: selectedConversation = $chats[localPage.params.chatId];

  $: conversations = Object.keys($chats)
    .map((id) => $chats[id])
    .sort(sortByLastActivity);

  // Unmark a newConversation as new when it becomes the selected conversation
  // TODO: change to "when it appears in $conversations" ?
  $: if (
    $newConversation &&
    selectedConversation &&
    selectedConversation.users &&
    selectedConversation.users.includes($newConversation.partnerId)
  ) {
    newConversation.set(null);
  }

  $: isOverviewPage = localPage.url.pathname == routes.CHAT;

  // TODO: do this with css grids, not with separate html templates switched by JS
  // It is currently not responsive without reloading.
  let outerWidth: number | undefined;
  let isMobile = false;
  $: typeof outerWidth === 'number' && outerWidth <= 700 ? (isMobile = true) : (isMobile = false);

  onMount(async () => {
    // opening a chat : ?with is handled in +page.svelte
    // new chat : /name/new?id= is handled in [name]/[chatId]/+page.svelte

    // TODO: work with continueUrls in the verification link?
    await checkAndHandleUnverified($_('chat.notify.unverified'));
  });

  onDestroy(() => {
    // Otherwise, when unverified and redirected away because of this from this page,
    // the <Progress> below has the side-effect on waiting for chat initialization
    // that will never happen.
    nProgress.done();
    unsubscribeFromPage();
  });

  // Functions
  const sortByLastActivity = (c1: LocalChat, c2: LocalChat) =>
    c2.lastActivity.toMillis() - c1.lastActivity.toMillis();

  const isConversationSeen = (conversation: LocalChat) => {
    // Seen if you are the last sender, or otherwise, if lastMessageSeen is undefined/null, or true
    return (
      conversation.lastMessageSender === getUser().id || conversation.lastMessageSeen !== false
    );
  };

  const selectConversation = (id: string | null) => {
    if (!id && $newConversation) {
      // TODO: not supplying ?id= here could lead to the recipient UID being unknown?
      goto(getConvoRoute($newConversation.name, `new?id=${$newConversation.partnerId}`));
    }
    if (id) {
      const chatName = $chats[id].partner.firstName.toLowerCase();
      goto(getConvoRoute(chatName, id));
    }
  };
</script>

<svelte:window bind:outerWidth />
<Progress active={!$hasInitialized || $creatingNewChat} />

{#if !localPage.url.searchParams.get('with') && $hasInitialized && $user && $user.emailVerified}
  <div class="container">
    <!-- Always show the conversation sidebar on desktop. 
      On mobile, only if we're showing the overview page. -->
    {#if outerWidth != null && (!isMobile || (isMobile && isOverviewPage))}
      <section class="conversations" in:fly={{ x: -outerWidth, duration: 400 }}>
        <h2>{$_('chat.all-conversations')}</h2>
        {#if $newConversation}
          <article>
            <ConversationCard
              on:click={() => selectConversation(null)}
              recipient={$newConversation.name}
              lastMessage={''}
              selected={localPage.params.chatId === 'new'}
            />
          </article>
        {/if}
        {#if $hasInitialized && conversations.length === 0 && !$newConversation}
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
                seen={isConversationSeen(conversation)}
                on:click={() => selectConversation(conversation.id)}
              />
            </article>
          {/each}
        {/if}
      </section>
    {/if}
    {#if !isMobile || (isMobile && !isOverviewPage)}
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
    font-weight: 500;
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
      height: calc(100vh - var(--height-mobile-nav));
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
      /* TODO: env(safe-area-inset-bottom) behavior check on safari mobile */
      height: calc(100% - env(safe-area-inset-bottom));
      width: 100%;
      padding: 2rem;
      padding-top: var(--spacing-chat-header);
      position: relative;
    }
  }
</style>
