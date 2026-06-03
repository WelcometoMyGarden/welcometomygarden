<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Avatar, Icon, DropdownMenu, DropdownMenuItem, ChatIconButton } from '$lib/components/UI';
  import { archiveIcon, unarchiveIcon, threeDotsIcon } from '$lib/images/icons';
  import { formatConversationCardTimestamp } from '$lib/util';

  interface Props {
    selected?: boolean;
    recipient: string;
    seen?: boolean;
    lastMessage: string | undefined;
    lastActivityMs?: number;
    archived?: boolean;
    onclick: () => void;
    onarchive?: () => void;
  }

  let {
    selected = false,
    recipient,
    seen = true,
    lastMessage,
    lastActivityMs,
    archived = false,
    onclick,
    onarchive
  }: Props = $props();

  let timestamp = $derived(
    lastActivityMs != null ? formatConversationCardTimestamp(lastActivityMs) : null
  );

  // ── Dropdown menu ─────────────────────────────────────────────────────
  let menuOpen = $state(false);
  let menuTop = $state(0);
  let menuRight = $state(0);

  const openMenu = (e: MouseEvent) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    const r = btn.getBoundingClientRect();
    menuTop = r.bottom + 4;
    menuRight = window.innerWidth - r.right;
    menuOpen = true;
  };

  const closeMenu = () => {
    menuOpen = false;
  };

  // ── Mouse hover — pointer-type aware, ignores touch fake-hover ────────
  let mouseOver = $state(false);

  const onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') mouseOver = true;
  };

  const onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') mouseOver = false;
  };

  // ── Swipe to archive — touch events only fire on touch-capable devices ─
  const SWIPE_REVEAL = 84;
  const SWIPE_COMMIT = 180;

  let dx = $state(0);
  let revealed = $state(false);
  let startX = 0;
  let startY = 0;
  let moved = false;
  /**
   * Whether the last touch interaction resulted in a horizontal swipe.
   * `false` means the swipe was vertical.
   * `null` means there was NO swipe in either direction (the threshold was not reached).
   */
  let isHorizontalSwipe: boolean | null = null;

  const reset = () => {
    dx = 0;
    revealed = false;
  };

  const getPoint = (e: TouchEvent) => (e.touches.length > 0 ? e.touches[0] : e.changedTouches[0]);

  const onTouchStart = (e: TouchEvent) => {
    const p = getPoint(e);
    startX = p.clientX;
    startY = p.clientY;
    moved = false;
    isHorizontalSwipe = null;
  };

  const onTouchMove = (e: TouchEvent) => {
    const p = getPoint(e);
    const dxRaw = p.clientX - startX;
    const dy = p.clientY - startY;
    if (isHorizontalSwipe === null) {
      if (Math.abs(dxRaw) > 6 || Math.abs(dy) > 6) {
        isHorizontalSwipe = Math.abs(dxRaw) > Math.abs(dy);
      } else return;
    }
    if (!isHorizontalSwipe) return;
    moved = true;
    let next = Math.min(0, dxRaw + (revealed ? -SWIPE_REVEAL : 0));
    if (next < -SWIPE_COMMIT - 40) next = -SWIPE_COMMIT - 40;
    dx = next;
  };

  const onTouchEnd = (e: TouchEvent) => {
    // Prevent the browser's synthesized click — we call onclick() ourselves below
    e.preventDefault();
    if (!moved || isHorizontalSwipe === false) {
      if (revealed) {
        reset();
        return;
      }
      // Only open the chat on a genuine tap, i.e. when the finger never crossed
      // the gesture threshold in ANY direction (isHorizontal stays null). A
      // vertical scroll sets isHorizontalSwipe to false and must NOT open the card.
      if (isHorizontalSwipe === null) {
        onclick();
      }
      return;
    }
    if (!isHorizontalSwipe) {
      reset();
      return;
    }
    if (dx <= -SWIPE_COMMIT) {
      dx = -500;
      setTimeout(() => {
        onarchive?.();
        reset();
      }, 180);
    } else if (dx <= -SWIPE_REVEAL) {
      dx = -SWIPE_REVEAL;
      revealed = true;
    } else {
      reset();
    }
  };

  let swipeTransition = $derived(
    dx === 0 || dx === -SWIPE_REVEAL || dx === -500
      ? 'transform .22s cubic-bezier(.2,.7,.3,1)'
      : 'none'
  );
</script>

<!-- Sliding row container: contains the content and the actions under the content -->
<div
  class="row-wrap"
  class:selected
  role="group"
  onpointerenter={onPointerEnter}
  onpointerleave={onPointerLeave}
>
  <!-- Action layer revealed behind the row when swiped left.
       It is entirely hidden when not swiped, because otherwise
       a weird subpixel horizontal line leak of the row-action dark green backgroud appears
       between conversation cards -->
  <div
    class="row-action"
    style:display={dx < 0 ? 'flex' : 'none'}
    role="button"
    tabindex="-1"
    aria-label={archived ? $_('chat.unarchive') : $_('chat.archive')}
    onclick={() => onarchive?.()}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') onarchive?.();
    }}
  >
    <div class="row-action-inner" style:width="{Math.min(SWIPE_REVEAL, -dx)}px">
      <Icon icon={archived ? unarchiveIcon : archiveIcon} />
      <span>{archived ? $_('chat.unarchive') : $_('chat.archive')}</span>
    </div>
  </div>

  <!-- Fixed-position dropdown menu (pointer/mouse users) -->
  <DropdownMenu open={menuOpen} onclose={closeMenu} top={menuTop} right={menuRight}>
    <DropdownMenuItem
      onclick={() => {
        closeMenu();
        onarchive?.();
      }}
    >
      <Icon icon={archived ? unarchiveIcon : archiveIcon} />
      <span>{archived ? $_('chat.unarchive-conversation') : $_('chat.archive-conversation')}</span>
    </DropdownMenuItem>
  </DropdownMenu>

  <!-- Sliding row content -->
  <button
    class="conversation row-content"
    class:selected
    style:transform="translateX({dx}px)"
    style:transition={swipeTransition}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
    onclick={() => {
      if (revealed) {
        reset();
        return;
      }
      onclick();
    }}
  >
    <Avatar name={recipient} />
    <div class="details">
      <div class="name-row">
        <span class="name" class:seen>{recipient}</span>
        {#if timestamp}
          <span class="timestamp" class:unseen={!seen}
            >{typeof timestamp === 'string' ? timestamp : $_(timestamp.key)}</span
          >
        {/if}
      </div>
      <p class="last-message notranslate" class:seen>
        {#if lastMessage}
          {lastMessage}
        {:else}
          <span class="badge">{$_('chat.new')}</span>
        {/if}
      </p>
    </div>
  </button>

  <!-- Dots button: absolutely positioned over the row, only for mouse users.
       Outside the <button> because nested <button> elements are invalid HTML. -->
  {#if mouseOver || menuOpen}
    <div class="dots-wrap">
      <ChatIconButton icon={threeDotsIcon} open={menuOpen} onclick={openMenu} />
    </div>
  {/if}
</div>

<style>
  /* ── Wrapper ─────────────────────────────────────────────── */
  .row-wrap {
    position: relative;
    overflow: hidden;
  }

  /* ── Swipe action layer ──────────────────────────────────── */
  .row-action {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    background: var(--color-green);
    color: var(--color-white);
    cursor: pointer;
    user-select: none;
  }

  .row-action-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    font-size: 1.1rem;
    font-weight: 600;
    overflow: hidden;
    min-width: 0;
  }

  .row-action-inner :global(i) {
    width: 2.2rem;
    height: 2.2rem;
  }

  .row-action-inner :global(svg) {
    stroke: var(--color-white);
  }

  /* ── Main conversation row ───────────────────────────────── */
  .conversation {
    appearance: none;
    -webkit-appearance: none;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding: 2rem 2.4rem 2rem 2rem;
    background-color: var(--color-white);
    border-left: 0.3rem solid transparent;
    transition:
      background 180ms ease-in-out,
      border-color 180ms ease-in-out;
    color: var(--color-green);
    cursor: pointer;
    width: 100%;
    text-align: left;
    border-right: none;
    border-top: none;
    border-bottom: none;
    font-family: inherit;
    font-size: inherit;
    position: relative;
  }

  .row-content {
    position: relative;
    z-index: 1;
    will-change: transform;
    /* Allow vertical scroll while JS handles horizontal swipe */
    touch-action: pan-y;
  }

  .conversation.selected {
    background-color: var(--color-green-light);
    border-left-color: var(--color-green);
  }

  /* any-hover: covers desktop mouse AND iPad/tablet with connected mouse */
  @media (any-hover: hover) {
    .conversation:hover {
      background-color: var(--color-beige-light);
    }

    .conversation.selected:hover {
      background-color: var(--color-green-light);
    }
  }

  /* Touch-only devices (no hover capability at all) */
  @media (any-hover: none) {
    .conversation:active {
      background-color: var(--color-green-light);
    }
  }

  /* ── Details ─────────────────────────────────────────────── */
  .details {
    flex: 1;
    min-width: 0;
  }

  .name-row {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    min-width: 0;
  }

  .name {
    font-weight: 600;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .name.seen {
    font-weight: 400;
  }

  .timestamp {
    font-size: 1.2rem;
    color: var(--color-darker-gray);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .timestamp.unseen {
    color: var(--color-copy);
    font-weight: 600;
  }

  .last-message {
    display: block;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 1.4rem;
    margin-top: 0.4rem;
    font-weight: 500;
    color: var(--color-copy);
  }

  .last-message.seen {
    font-weight: 400;
  }

  .badge {
    background-color: var(--color-green);
    border-radius: 0.6rem;
    color: var(--color-white);
    padding: 0.4rem 0.8rem;
    font-size: 1.2rem;
    font-weight: bold;
    text-transform: uppercase;
    display: inline-flex;
  }

  /* ── Dots menu button ────────────────────────────────────── */
  .dots-wrap {
    position: absolute;
    right: 2.4rem;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
  }

  /* ── Responsive ──────────────────────────────────────────── */
  @media (min-width: 701px) and (max-width: 850px) {
    .conversation {
      padding: 1rem 1.4rem;
    }
  }
</style>
