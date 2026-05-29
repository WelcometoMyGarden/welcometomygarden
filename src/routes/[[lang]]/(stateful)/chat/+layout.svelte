<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import { linear } from 'svelte/easing';
  import { flip } from 'svelte/animate';
  import { goto } from '$lib/util/navigate';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import {
    chats,
    visibleChats,
    isArchivedView,
    archivedCount,
    isChatArchivedByUser,
    lastArchiveAction,
    creatingNewChat,
    hasInitialized,
    getChatForUser,
    newConversation
  } from '$lib/stores/chat';
  import routes, { visibleRoute } from '$lib/routes';
  import { initiateChat, archiveChat, unarchiveChat } from '$lib/api/chat';
  import { isConversationSeen, toggleArchiveForChat } from './archive-actions.svelte';
  import ConversationCard from '$lib/components/Chat/ConversationCard.svelte';
  import EmptyChatState from './EmptyChatState.svelte';
  import ChatToast from '$lib/components/Chat/ChatToast.svelte';
  import { Progress, Icon, ChatIconButton } from '$lib/components/UI';
  import { archiveIcon } from '$lib/images/icons';
  import chevronRight from '$lib/images/icons/chevron-right.svg?inline';
  import { onMount, tick } from 'svelte';
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
  import { isMobile } from '$lib/stores/ui.svelte';
  import logger from '$lib/util/logger';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // Card leaving the list: slide out to the left while fading.
  const CARD_OUT_DURATION = 300;

  // When switching between the "all" and "archived" lists, the cards from the
  // previous view are removed from the list. We don't want their outro to play
  // in that case — only genuine archive/unarchive actions should animate.
  let suppressCardAnimations = $state(false);
  const switchArchivedView = async (value: boolean) => {
    if ($isArchivedView === value) return;
    suppressCardAnimations = true;
    isArchivedView.set(value);
    await tick();
    suppressCardAnimations = false;
  };

  onMount(async () => {
    if (!$user) {
      notify.info($_('auth.unsigned'), 8000);
      // Use continueUrl with all URL paramters restored after sign-in
      return goto(
        `${$lr(routes.SIGN_IN)}?continueUrl=${document.location.pathname}${document.location.search}${document.location.hash}`
      );
    }

    // Note: this takes unverified (new) users away to /account when they come from the map
    // Note: this takes unverified (new) users away to /account when they come from the map
    await checkAndHandleUnverified($_('chat.notify.unverified'));

    // Both these can contain a UID
    let withQueryParam = $page.url.searchParams.get('with');
    let idQueryParam = $page.url.searchParams.get('id');

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
   * Opens a new or existing chat from the map
   */
  const startChattingWith = async (partnerId: string) => {
    if ($chats) {
      const existingChatWithUser = getChatForUser(partnerId);
      if (existingChatWithUser) {
        const existingChat = $chats[existingChatWithUser];
        // Unarchive the chat before continuing the chat, if it is archived
        if ($user && isChatArchivedByUser(existingChat, $user.id)) {
          await unarchiveChat(existingChat.id, existingChat.partner.firstName);
        }
        return goto(
          $lr(getConvoRoute(existingChat.partner.firstName, existingChatWithUser)),
          gotoOpts
        );
      }

      // Otherwise: new chat case
      try {
        await initiateNewChatWith(partnerId);
        goto($lr(getConvoRoute($newConversation?.name || '', `new?id=${partnerId}`)), gotoOpts);
      } catch (ex) {
        // TODO: display error
        logger.error(ex);
        Sentry.captureException(ex, {
          extra: { context: 'Initiating new chat' }
        });
        goto($lr(routes.CHAT), gotoOpts);
      }
    }
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
      logger.error('Something went wrong when selecting a chat');
    }
  };

  let selectedConversation = $derived($chats[$page.params.chatId ?? '']);
  let conversations = $derived(
    Object.keys($visibleChats)
      .map((id) => $visibleChats[id])
      .sort(sortByLastActivity)
  );
  let isOverview = $derived(
    visibleRoute($page.route.id ?? '') === routes.CHAT ||
      visibleRoute($page.route.id ?? '') === routes.CHAT_ARCHIVE
  );

  // Initialise from the current route (e.g. deep-link directly to /chat/archive)
  isArchivedView.set(visibleRoute($page.route.id ?? '') === routes.CHAT_ARCHIVE);

  afterNavigate(({ to }) => {
    const toRoute = visibleRoute(to?.route?.id ?? '');
    if (toRoute === routes.CHAT_ARCHIVE) switchArchivedView(true);
    else if (toRoute === routes.CHAT) switchArchivedView(false);
    // Navigating to a specific chat: no change — retain current context
  });

  $effect(() => {
    if (
      $newConversation &&
      selectedConversation &&
      selectedConversation.users &&
      selectedConversation.users.includes($newConversation.partnerId)
    ) {
      $newConversation = null;
    }

    // If we load a conversation that is archived, then show the archived list, and vice-versa
    if (
      $user &&
      selectedConversation &&
      isChatArchivedByUser(selectedConversation, $user?.id) !== $isArchivedView
    ) {
      switchArchivedView(isChatArchivedByUser(selectedConversation, $user?.id));
    }
  });

  // ── Undo toast ────────────────────────────────────────────────────────────
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (!$lastArchiveAction) return;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      lastArchiveAction.set(null);
      toastTimer = null;
    }, 5200);
  });

  const undoLast = async () => {
    const action = $lastArchiveAction;
    if (!action) return;
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    lastArchiveAction.set(null);
    if (action.kind === 'archive') {
      await unarchiveChat(action.chatId, action.chatName);
    } else {
      await archiveChat(action.chatId, action.chatName);
    }
  };
</script>

<Progress active={!$hasInitialized || $creatingNewChat} />

{#if !$page.url.searchParams.get('with') && $hasInitialized && $user && $user.emailVerified}
  <div class="container">
    {#if !isMobile() || (isMobile() && isOverview)}
      <!-- Chat listing -->
      <section
        class="conversations"
        in:fly={{ x: '-100%', duration: 400 }}
        class:is-mobile={isMobile()}
      >
        <!-- List header -->
        {#if !$isArchivedView}
          <div class="listnav">
            <h2 class="listnav-title">{$_('chat.all-conversations')}</h2>
            <ChatIconButton
              icon={archiveIcon}
              variant="header"
              ariaLabel="{$_('chat.open-archive')} ({$archivedCount})"
              title={$_('chat.tabs.archived')}
              onclick={() => goto($lr(routes.CHAT_ARCHIVE))}
            />
          </div>
        {:else}
          <div class="listnav archive">
            <button
              class="listnav-back"
              onclick={() => goto($lr(routes.CHAT))}
              aria-label="Back to All conversations"
              title="Back"
            >
              <Icon greenStroke rotate={180} icon={chevronRight} />
            </button>
            <h2 class="listnav-title center">{$_('chat.tabs.archived')}</h2>
          </div>
        {/if}

        <!-- Conversation rows -->
        {#if $newConversation && !$isArchivedView}
          <article>
            <ConversationCard
              onclick={() => selectConversation('new')}
              recipient={$newConversation.name}
              lastMessage={''}
              selected={$page.params.chatId === 'new'}
            />
          </article>
        {/if}

        {#if conversations.length === 0 && !($newConversation && !$isArchivedView)}
          {#if $isArchivedView}
            <EmptyChatState
              title={$_('chat.no-archived.title')}
              detail={$_('chat.no-archived.detail')}
              actionLabel={$_('chat.no-archived.button')}
              onaction={() => goto($lr(routes.CHAT))}
            />
          {:else}
            <EmptyChatState
              title={$_('chat.no-inbox.title')}
              detail={$_('chat.no-inbox.detail')}
              actionLabel={$_('chat.no-inbox.button')}
              onaction={() => goto($lr(routes.MAP))}
            />
          {/if}
        {:else}
          {#each conversations as conversation (conversation.id)}
            <article
              animate:flip={{
                duration: 400,
                delay: suppressCardAnimations ? 0 : CARD_OUT_DURATION
              }}
              out:fly={{
                x: '-100%',
                duration: suppressCardAnimations ? 0 : CARD_OUT_DURATION,
                easing: linear
              }}
            >
              <ConversationCard
                recipient={$chats[conversation.id].partner.firstName}
                lastMessage={conversation.lastMessage}
                lastActivityMs={conversation.lastActivity.toMillis()}
                selected={selectedConversation && selectedConversation.id === conversation.id}
                seen={isConversationSeen(conversation)}
                archived={$user ? isChatArchivedByUser(conversation, $user.id) : false}
                onclick={() => selectConversation(conversation.id)}
                onarchive={() => toggleArchiveForChat(conversation)}
              />
            </article>
          {/each}
        {/if}
      </section>
    {/if}

    {#if !isMobile() || (isMobile() && !isOverview)}
      <!-- Specific opened chat -->
      <div class="chat" in:fly={{ x: '100%', duration: 400 }}>
        {@render children?.()}
      </div>
    {/if}

    <!-- Undo toast -->
    {#if $lastArchiveAction}
      <ChatToast
        message={$lastArchiveAction.kind === 'archive'
          ? $_('chat.archived-one', { values: { name: $lastArchiveAction.chatName } })
          : $_('chat.unarchived-one', { values: { name: $lastArchiveAction.chatName } })}
        undoLabel={$_('chat.undo')}
        onundo={undoLast}
      />
    {/if}
  </div>
{/if}

<style>
  .container {
    max-width: 120rem;
    width: 100%;
    /* The bottom padding */
    padding: 4rem 2rem;
    display: flex;
    margin: 0 auto;
    height: 100%;
    position: relative;
  }

  .conversations {
    width: 40rem;
    border-radius: 0.6rem;
    margin-right: 4rem;
    height: 100%;
    overflow-y: auto;
    /*
      This should be applied on .conversations, and not on .container,
      because otherwise, a visual jump is visible when opening chats.
      -> you open the specific chat (component mounts) -> component animates in, still with container top padding applied
      -> specific chat CSS (fixed top 0 + safe area) is loaded -> it jumps back down
    */
    padding-top: max(0px, env(safe-area-inset-top, 0px) - 1.3rem);
    display: flex;
    flex-direction: column;
  }

  .conversations:not(.is-mobile) {
    /* Avoid box shadow escaping on the top when using safe area top insets on native mobile */
    box-shadow: 0px 0px 33px rgba(0, 0, 0, 0.1);
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

  /* ── List navigation header ────────────────────────────────────── */
  .listnav {
    display: flex;
    align-items: center;
    padding: 2.4rem 1.8rem 1.2rem 2.4rem;
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-gray);
  }

  .listnav.archive {
    padding: 2.4rem 2.4rem 1.2rem 1rem;
    gap: 0.4rem;
  }

  .listnav-title {
    font-family: var(--fonts-copy);
    font-size: 2.2rem;
    font-weight: 500;
    color: var(--color-green);
    flex: 1;
  }

  .listnav-title.center {
    text-align: center;
  }

  .listnav-back {
    width: 3.6rem;
    height: 3.9rem;
    /* Compensate for the non-centered internal svg, along with the height above */
    padding: 5px 5px 5px 0;
    border-radius: 0.6rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-green);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 150ms;
    flex-shrink: 0;
  }

  .listnav-back:hover {
    background: var(--color-gray);
  }

  /* ── Responsive ────────────────────────────────────────────────── */
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
      box-shadow: none;
      height: 100%;
      overflow-y: auto;
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
