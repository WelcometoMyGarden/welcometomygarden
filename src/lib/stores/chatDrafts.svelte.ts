import { browser } from '$app/environment';
import { debounce } from 'lodash-es';
import logger from '$lib/util/logger';

/**
 * localStorage key holding the JSON map of drafts, keyed identically to the in-memory state.
 */
export const CHAT_DRAFTS_STORAGE_KEY = 'chatDrafts';

/**
 * How long typing has to pause before the drafts are mirrored into localStorage.
 * Typed text lands in memory immediately; only the write to disk waits, so we
 * don't touch localStorage on every keystroke.
 */
export const DRAFT_PERSIST_DEBOUNCE = 3000;

export const draftState = $state<{
  /**
   * Message drafts of chats that were left with unsent text in their message box,
   * keyed by `draftKey()`.
   *
   * Mirrored into localStorage (debounced), and restored from it on page load, so
   * drafts survive both a chat switch and a reload.
   */
  drafts: { [draftKey: string]: string };
  /**
   * The chat list line of the chat that is open, held at the draft it had when it
   * was opened. Opening a chat therefore doesn't take its draft off the list, and
   * typing in it doesn't change the line under the user's eyes. What the line
   * shows is only re-decided on sending, switching chats and leaving the chat.
   */
  heldListing: { key: string; draft: string } | null;
}>({ drafts: {}, heldListing: null });

/**
 * The key a chat's draft is stored under.
 *
 * For an existing chat this is its Firebase document id. A chat that doesn't
 * exist yet lives at the `new` path segment, which is reused for every new
 * conversation, so those are keyed by their recipient instead.
 *
 * Null when there is nothing to key a draft by (no chat open, or a new chat
 * without a known recipient).
 */
export const draftKey = (
  chatId: string | null | undefined,
  partnerId?: string | null
): string | null => {
  if (!chatId) return null;
  if (chatId === 'new') return partnerId ? `new:${partnerId}` : null;
  return chatId;
};

export const getDraft = (key: string | null | undefined): string =>
  (key && draftState.drafts[key]) || '';

const persistDrafts = () => {
  if (!browser) return;
  try {
    if (Object.keys(draftState.drafts).length === 0) {
      localStorage.removeItem(CHAT_DRAFTS_STORAGE_KEY);
    } else {
      localStorage.setItem(CHAT_DRAFTS_STORAGE_KEY, JSON.stringify(draftState.drafts));
    }
  } catch (e) {
    // For example when storage is full or unavailable. Drafts then only live in memory.
    logger.error(e);
  }
};

const persistDraftsDebounced = debounce(persistDrafts, DRAFT_PERSIST_DEBOUNCE);

/** Writes a pending debounced change to localStorage right away. */
const persistDraftsNow = () => {
  persistDraftsDebounced.cancel();
  persistDrafts();
};

/**
 * Stores what is currently typed for the given chat.
 * An empty value (the box was backspaced clean) drops the draft entirely.
 */
export const setDraft = (key: string | null | undefined, value: string) => {
  if (!key) return;
  if (value === '') {
    clearDraft(key);
    return;
  }
  if (draftState.drafts[key] === value) return;
  draftState.drafts[key] = value;
  persistDraftsDebounced();
};

/** Removes a draft from both the state and localStorage. */
export const clearDraft = (key: string | null | undefined) => {
  if (!key || !(key in draftState.drafts)) return;
  delete draftState.drafts[key];
  persistDraftsNow();
};

/**
 * Drops a draft that holds nothing but whitespace and newlines. Called when a
 * chat is left: while it is open, whitespace is the user's to keep.
 */
export const clearDraftIfBlank = (key: string | null | undefined) => {
  const draft = getDraft(key);
  if (draft && draft.trim() === '') clearDraft(key);
};

/** Ensures typing that is still within the debounce window makes it to localStorage. */
export const flushDrafts = () => {
  persistDraftsDebounced.flush();
};

/**
 * Holds the chat list line of the chat that just opened at its current draft.
 * Replaces any previously held line, whose chat goes back to showing its live draft.
 */
export const holdDraftListing = (key: string | null | undefined) => {
  draftState.heldListing = key ? { key, draft: getDraft(key) } : null;
};

/** Stops holding a line, because no chat is open anymore. */
export const releaseDraftListing = () => {
  draftState.heldListing = null;
};

/** The draft to show on a chat's line in the chat list, if any. */
export const getListedDraft = (key: string | null | undefined): string => {
  const held = draftState.heldListing;
  if (key && held?.key === key) return held.draft;
  return getDraft(key);
};

/**
 * Drops every draft and removes the storage key altogether, so no unsent text
 * lingers on this device for whoever logs in next.
 */
export const wipeDrafts = () => {
  draftState.drafts = {};
  draftState.heldListing = null;
  persistDraftsDebounced.cancel();
  if (!browser) return;
  try {
    localStorage.removeItem(CHAT_DRAFTS_STORAGE_KEY);
  } catch (e) {
    logger.error(e);
  }
};

const loadDrafts = () => {
  if (!browser) return;
  try {
    const stored = localStorage.getItem(CHAT_DRAFTS_STORAGE_KEY);
    if (!stored) return;
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return;
    draftState.drafts = Object.fromEntries(
      Object.entries(parsed).filter(
        ([, draft]) => typeof draft === 'string' && draft.trim() !== ''
      ) as [string, string][]
    );
  } catch (e) {
    // Corrupted or unreadable storage: start without drafts rather than break the chat.
    logger.error(e);
  }
};

// Restore drafts as soon as this module is loaded, which happens before the chat
// list or a chat's message box first renders.
loadDrafts();

if (browser) {
  // A closing tab or a backgrounded app doesn't unmount the message box, so text
  // typed within the debounce window would never be written. Both handlers are
  // no-ops when there is nothing pending.
  window.addEventListener('pagehide', flushDrafts);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushDrafts();
  });
}
