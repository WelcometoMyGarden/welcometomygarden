<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fly, fade } from 'svelte/transition';
  import { linear, cubicOut } from 'svelte/easing';
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
  import BackButton from './BackButton.svelte';
  import ChatToast from '$lib/components/Chat/ChatToast.svelte';
  import { Progress, ChatIconButton } from '$lib/components/UI';
  import { archiveIcon, chatIcon } from '$lib/images/icons';
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
  import { wait } from '$lib/util/timeout';
  import { EMPTY_FADE_DURATION } from './_shared';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // Card leaving the list: slide out to the left while fading.
  const CARD_OUT_DURATION = 300;

  // How long the empty state takes to fade out. Keep in sync with the fade
  // duration in EmptyChatState.svelte — a card replacing the empty state waits
  // this long before revealing itself, so the two never overlap.

  // Reveal a card by sliding it open while fading in. Used only when a card
  // replaces the empty state: passing duration 0 makes it a no-op so ordinary
  // card insertions (new messages, view switches) are unaffected.
  const revealCard = (node: Element, { delay = 0, duration = 0 } = {}) => {
    if (!duration) return { duration: 0 };
    const style = getComputedStyle(node);
    const height = parseFloat(style.height);
    return {
      delay,
      duration,
      easing: cubicOut,
      css: (t: number) => `overflow: hidden; opacity: ${t}; height: ${t * height}px;`
    };
  };

  // Switching between the "all" and "archived" lists fades the whole list out,
  // swaps the underlying data while it's invisible, then fades the new list
  // back in. This keeps the two views from ever being in the DOM at the same
  // time, which would make the list (and its header) visibly jump.
  const VIEW_FADE_DURATION = 150;

  // When switching views, the previous view's cards are removed in bulk. We
  // don't want their individual outro to play in that case — only genuine
  // archive/unarchive actions should animate per-card.
  let suppressCardAnimations = $state(false);
  // Drives the fade of the whole list while switching views.
  let viewVisible = $state(true);
  // Latest-switch-wins guard, so rapid toggles don't fight each other.
  // Switches executed while older switches are in progress cancel the effects of the older ones.
  let switchToken = 0;
  let pendingArchivedView: boolean | null = null;

  const switchArchivedView = async (value: boolean) => {
    // Compare against the in-flight target (if any), since `isArchivedView` is
    // only updated halfway through the fade.
    if ((pendingArchivedView ?? $isArchivedView) === value) return;
    pendingArchivedView = value;
    const token = ++switchToken;
    suppressCardAnimations = true;
    // Fade the current list out.
    viewVisible = false;
    await wait(VIEW_FADE_DURATION);
    if (token !== switchToken) return;
    // Swap the data while nothing is visible, then fade the new list in.
    isArchivedView.set(value);
    if (token !== switchToken) return;
    viewVisible = true;
    // tick: wait until the view has rendered before unsupressing
    // the inner card animations, otherwise they still play.
    await tick();
    if (token !== switchToken) return;
    suppressCardAnimations = false;
    pendingArchivedView = null;
  };

  // While true, a card is being removed by a committed swipe gesture. The swipe
  // already animated the row off-screen, so we skip the list's own leave-
  // animation (and the flip delay that waits for it) to avoid a second slide.
  let swipeLeaving = $state(false);

  const archiveFromCard = async (conversation: LocalChat, viaSwipe = false) => {
    if (!viaSwipe) {
      toggleArchiveForChat(conversation);
      return;
    }
    swipeLeaving = true;
    try {
      // Firestore locally removes the card synchronously here, so
      // its `out:` transition runs (with duration 0) while swipeLeaving is true.
      await toggleArchiveForChat(conversation);
      await tick();
    } finally {
      // Allow normal animations again
      swipeLeaving = false;
    }
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

  // Track whether the list just went from empty → populated (e.g. a chat is
  // archived/unarchived elsewhere while we're looking at the empty state). In
  // that case a card should hold off until the empty state has faded out,
  // instead of popping in alongside it.
  let cameFromEmpty = $state(false);
  let prevConversationsEmpty: boolean | null = null;
  $effect.pre(() => {
    // Only start tracking once chats have loaded, so the initial render of an
    // already-populated list doesn't count as "coming from empty".
    if (!$hasInitialized) return;
    const empty = conversations.length === 0;
    cameFromEmpty = prevConversationsEmpty === true && !empty;
    prevConversationsEmpty = empty;
  });
  // Don't delay during view switches — the whole list fades there instead.
  let delayCardIntro = $derived(cameFromEmpty && !suppressCardAnimations);

  // During a view switch the empty state fades in lockstep with the list
  // wrapper (VIEW_FADE_DURATION); otherwise it uses its own, slower fade so a
  // card appearing/disappearing within the current view stays in sync with the
  // delayed card reveal (EMPTY_FADE_DURATION).
  let emptyFadeDuration = $derived(
    suppressCardAnimations ? VIEW_FADE_DURATION : EMPTY_FADE_DURATION
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
    // Don't record the reverse action for undo — otherwise undoing spawns
    // another undo toast.
    if (action.kind === 'archive') {
      await unarchiveChat(action.chatId, action.chatName, false);
    } else {
      await archiveChat(action.chatId, action.chatName, false);
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
        {#if viewVisible}
          <div class="view" transition:fade={{ duration: VIEW_FADE_DURATION }}>
            <!-- List header -->
            {#if !$isArchivedView}
              <div class="listnav">
                <h2 class="listnav-title">{$_('chat.all-conversations')}</h2>
                <ChatIconButton
                  icon={archiveIcon}
                  variant="header"
                  ariaLabel="{$_('chat.open-archive')} ({$archivedCount})"
                  title={$_('chat.archived')}
                  onclick={() => goto($lr(routes.CHAT_ARCHIVE))}
                />
              </div>
            {:else}
              <div class="listnav archive">
                <BackButton
                  onclick={() => goto($lr(routes.CHAT))}
                  ariaLabel="Back to All conversations"
                  title="Back"
                />
                <h2 class="listnav-title center">{$_('chat.archived')}</h2>
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
                  icon={archiveIcon}
                  actionLabel={$_('chat.no-archived.button')}
                  onaction={() => goto($lr(routes.CHAT))}
                  duration={emptyFadeDuration}
                />
              {:else if $archivedCount > 0}
                <!-- No active conversations, but some are archived -->
                <EmptyChatState
                  title={$_('chat.no-active.title')}
                  detail={$_('chat.no-active.detail')}
                  actionLabel={$_('chat.no-inbox.button')}
                  onaction={() => goto($lr(routes.MAP))}
                  icon={chatIcon}
                  duration={emptyFadeDuration}
                />
              {:else}
                <EmptyChatState
                  title={$_('chat.no-inbox.title')}
                  detail={$_('chat.no-inbox.detail')}
                  icon={chatIcon}
                  actionLabel={$_('chat.no-inbox.button')}
                  onaction={() => goto($lr(routes.MAP))}
                  duration={emptyFadeDuration}
                />
              {/if}
            {:else}
              {#each conversations as conversation (conversation.id)}
                <article
                  animate:flip={{
                    duration: 400,
                    delay: suppressCardAnimations || swipeLeaving ? 0 : CARD_OUT_DURATION
                  }}
                  in:revealCard|global={{
                    duration: delayCardIntro ? EMPTY_FADE_DURATION : 0,
                    // Wait until the empty state has faded out before inserting
                    delay: delayCardIntro ? EMPTY_FADE_DURATION : 0
                  }}
                  out:fly={{
                    x: '-100%',
                    duration: suppressCardAnimations || swipeLeaving ? 0 : CARD_OUT_DURATION,
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
                    onarchive={(viaSwipe) => archiveFromCard(conversation, viaSwipe)}
                  />
                </article>
              {/each}
            {/if}
          </div>
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
        undoLabel={$_('generics.undo')}
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

  /* Wraps the header + rows so the whole list fades as one unit when switching
     between the all/archived views. */
  .view {
    display: flex;
    flex-direction: column;
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
    /* Note: the content is given a height from the archive view icon */
    padding: 2.2rem 1.9rem 2.2rem 3rem;
    flex-shrink: 0;
  }

  .listnav.archive {
    padding: 2.9rem 3rem;
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
