<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import { getUser, user } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import {
    chats,
    creatingNewChat,
    hasInitialized,
    getChatForUser,
    newConversation
  } from '$lib/stores/chat';
  import routes, { currentRoute } from '$lib/routes';
  import { initiateChat } from '$lib/api/chat';
  import ConversationCard from '$lib/components/Chat/ConversationCard.svelte';
  import { Progress } from '$lib/components/UI';
  import { onMount } from 'svelte';
  import { checkAndHandleUnverified } from '$lib/api/auth';
  import createSlug from '$lib/util/createSlug';
  import { onDestroy } from 'svelte';
  import nProgress from 'nprogress';
  import type { LocalChat } from '$lib/types/Chat';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import createUrl from '$lib/util/create-url';
  import * as Sentry from '@sentry/sveltekit';
  import { lr } from '$lib/util/translation-helpers';

  let localPage = $page;
  // Subscribe to page is necessary to render the chat page of the selected chat (when the url changes) for mobile
  const unsubscribeFromPage = page.subscribe((currentPage) => (localPage = currentPage));

  $: selectedConversation = $chats[localPage.params.chatId];

  $: conversations = Object.keys($chats)
    .map((id) => $chats[id])
    .sort(sortByLastActivity);

  $: if (
    $newConversation &&
    selectedConversation &&
    selectedConversation.users &&
    selectedConversation.users.includes($newConversation.partnerId)
  ) {
    $newConversation = null;
  }

  $: isOverview = $currentRoute === routes.CHAT;

  // TODO: do this with css grids, not with separate html templates switched by JS
  // It is currently not responsive without reloading.
  let outerWidth: number | undefined;
  let isMobile = false;
  $: typeof outerWidth === 'number' && outerWidth <= 700 ? (isMobile = true) : (isMobile = false);

  onMount(async () => {
    if (!$user) {
      notify.info($_('auth.unsigned'), 8000);
      // Use continueUrl with all URL paramters restored after sign-in
      return goto(
        `${$lr(routes.SIGN_IN)}?continueUrl=${document.location.pathname}${document.location.search}${document.location.hash}`
      );
    }
    await checkAndHandleUnverified($_('chat.notify.unverified'));

    let withQueryParam = localPage.url.searchParams.get('with');
    let idQueryParam = localPage.url.searchParams.get('id');

    if (withQueryParam) {
      if (!$user.superfan) {
        // The ?with is only used when coming from the map
        // We also log the "direct" source when opening the modal itself, but the leading debouncer
        // should ignore that call.
        trackEvent(PlausibleEvent.OPEN_MEMBERSHIP_MODAL, {
          source: 'map_garden'
        });
      }
      startChattingWith(withQueryParam);
    } else if (idQueryParam) {
      // This doesn't goto(), which isn't needed, since in this case,
      // we should already be on a specific chat page.
      initiateNewChatWith(idQueryParam);
    }
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

  /**
   * Create a route for a specific chat with the slugified name or the chat partner (for aesthetic purposes),
   * and their UID (for an actual lookup)
   * ! Does NOT localize its output, this is the responsibility of the calling function.
   * @param partnerName
   * @param chatId
   */
  const getConvoRoute = (partnerName: string, chatId: string) =>
    `${routes.CHAT}/${createSlug(partnerName)}/${chatId}`;

  // When coming from the map and opening the specific chat route, ignore that we were on this /chat index page
  const gotoOpts = { replaceState: true };

  /**
   * Fetches the profile of the partner and sets it as a new conversation
   * @param partnerId
   */
  const initiateNewChatWith = async (partnerId: string) => {
    const newPartner = await initiateChat(partnerId);
    $newConversation = { name: newPartner.firstName, partnerId };
  };

  /**
   * Opens a new or existing chat
   */
  const startChattingWith = async (partnerId: string) => {
    if ($chats) {
      const existingChatWithUser = getChatForUser(partnerId);
      if (existingChatWithUser) {
        return goto(
          $lr(getConvoRoute($chats[existingChatWithUser].partner.firstName, existingChatWithUser)),
          gotoOpts
        );
      }

      // Otherwise: new chat case
      try {
        await initiateNewChatWith(partnerId);
        goto($lr(getConvoRoute($newConversation?.name || '', `new?id=${partnerId}`)), gotoOpts);
      } catch (ex) {
        // TODO: display error
        console.error(ex);
        Sentry.captureException(ex, {
          extra: { context: 'Initiating new chat' }
        });
        goto($lr(routes.CHAT), gotoOpts);
      }
    }
  };

  const isConversationSeen = (conversation: LocalChat) => {
    // Seen if you are the last sender, or otherwise, if lastMessageSeen is undefined/null, or true
    return (
      conversation.lastMessageSender === getUser().id || conversation.lastMessageSeen !== false
    );
  };

  const selectConversation = (id: string) => {
    // The 'new' chat ID is a special case
    if (id === 'new' && $newConversation) {
      // Go back to the cached "new conversation".
      // BE SURE TO INCLUDE THE ?id= QUERY PARAM BACK! Otherwise we don't know with whom to start a chat.
      // TODO: this leads to the chat sending error modal now, but even without sending the chat,
      // we know we are missing the chat partner.
      // TODO: the design of this can be improved.
      // - Maybe using /chat/bob/new/[partnerId] (as an alt to the query param)
      // - Or just by checking every time with the backend whether the chat already exists or not: /chat/bob/[partnerId]
      //   (1. check for conversation id existence, 2. check for partner id existence)
      goto(
        createUrl($lr(getConvoRoute($newConversation.name, 'new')), {
          id: $newConversation.partnerId
        })
      );
    } else if (id) {
      const chatName = $chats[id].partner.firstName.toLowerCase();
      goto($lr(getConvoRoute(chatName, id)));
    } else {
      // TODO: show this error
      console.error('Something went wrong when selecting a chat');
    }
  };
</script>

<svelte:window bind:outerWidth />
<Progress active={!$hasInitialized || $creatingNewChat} />

{#if !localPage.url.searchParams.get('with') && $hasInitialized && $user && $user.emailVerified}
  <div class="container">
    {#if outerWidth != null && (!isMobile || (isMobile && isOverview))}
      <section class="conversations" in:fly={{ x: -outerWidth, duration: 400 }}>
        <h2>{$_('chat.all-conversations')}</h2>
        {#if $newConversation}
          <article>
            <ConversationCard
              on:click={() => selectConversation('new')}
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
                link: `<a class="link" href="${$lr(routes.MAP)}">${$_('chat.no-messages.link')}</a>`
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
    {#if !isMobile || (isMobile && !isOverview)}
      <div class="chat" in:fly={{ x: outerWidth, duration: 400 }}>
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
    /* The bottom padding */
    padding: 4rem 2rem;
    display: flex;
    margin: 0 auto;
    height: 100%;
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

  .chat {
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
    .chat {
      width: calc(100% - 32rem);
    }
  }

  @media screen and (max-width: 700px) {
    .container {
      width: 100%;
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

    .chat {
      height: 100%;
      width: 100%;
      padding-bottom: 1.2rem;
      padding-top: var(--spacing-chat-header);
      position: relative;
    }
  }
</style>
