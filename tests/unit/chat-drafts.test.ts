import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The drafts store only touches localStorage in the browser
vi.mock('$app/environment', () => ({ browser: true }));

const storage = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key)
});
// The module registers flush handlers on the window/document when loaded
vi.stubGlobal('window', { addEventListener: () => {} });
vi.stubGlobal('document', { addEventListener: () => {}, visibilityState: 'visible' });

const STORAGE_KEY = 'chatDrafts';

/**
 * Imports a fresh copy of the store, so each test starts from empty state and
 * re-runs the localStorage restore on "page load".
 */
const loadStore = async () => {
  vi.resetModules();
  return await import('$lib/stores/chatDrafts.svelte');
};

const stored = () => JSON.parse(storage.get(STORAGE_KEY) ?? 'null');

beforeEach(() => {
  storage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('draftKey', () => {
  it('keys an existing chat by its chat id', async () => {
    const { draftKey } = await loadStore();
    expect(draftKey('chat1')).toBe('chat1');
  });

  it('keys a chat that does not exist yet by its recipient', async () => {
    const { draftKey } = await loadStore();
    // The 'new' path segment is reused for every new conversation
    expect(draftKey('new', 'partner1')).toBe('new:partner1');
  });

  it('has no key without a chat, or for a new chat without a recipient', async () => {
    const { draftKey } = await loadStore();
    expect(draftKey(undefined)).toBeNull();
    expect(draftKey('new')).toBeNull();
  });
});

describe('drafts', () => {
  it('keeps a draft per chat', async () => {
    const { setDraft, getDraft } = await loadStore();
    setDraft('chat1', 'hello there');
    setDraft('chat2', 'other chat');
    expect(getDraft('chat1')).toBe('hello there');
    expect(getDraft('chat2')).toBe('other chat');
    expect(getDraft('chat3')).toBe('');
  });

  it('only writes to localStorage after typing pauses', async () => {
    const { setDraft, DRAFT_PERSIST_DEBOUNCE } = await loadStore();
    setDraft('chat1', 'h');
    setDraft('chat1', 'he');
    expect(storage.has(STORAGE_KEY)).toBe(false);

    vi.advanceTimersByTime(DRAFT_PERSIST_DEBOUNCE - 1);
    expect(storage.has(STORAGE_KEY)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(stored()).toEqual({ chat1: 'he' });
  });

  it('restores drafts from localStorage on page load', async () => {
    storage.set(STORAGE_KEY, JSON.stringify({ chat1: 'restored', chat2: '   ' }));
    const { getDraft } = await loadStore();
    expect(getDraft('chat1')).toBe('restored');
    // Blank drafts aren't worth restoring
    expect(getDraft('chat2')).toBe('');
  });

  it('survives unusable stored data', async () => {
    storage.set(STORAGE_KEY, '{not json');
    const { getDraft } = await loadStore();
    expect(getDraft('chat1')).toBe('');
  });

  it('drops an emptied draft from the state and localStorage right away', async () => {
    const { setDraft, getDraft, DRAFT_PERSIST_DEBOUNCE } = await loadStore();
    setDraft('chat1', 'typo');
    setDraft('chat2', 'kept');
    vi.advanceTimersByTime(DRAFT_PERSIST_DEBOUNCE);
    expect(stored()).toEqual({ chat1: 'typo', chat2: 'kept' });

    // Backspaced clean
    setDraft('chat1', '');
    expect(getDraft('chat1')).toBe('');
    // No debounce wait: the removal is written immediately
    expect(stored()).toEqual({ chat2: 'kept' });
  });

  it('removes the storage entry once the last draft is gone', async () => {
    const { setDraft, DRAFT_PERSIST_DEBOUNCE } = await loadStore();
    setDraft('chat1', 'only one');
    vi.advanceTimersByTime(DRAFT_PERSIST_DEBOUNCE);
    setDraft('chat1', '');
    expect(storage.has(STORAGE_KEY)).toBe(false);
  });

  it('clears a whitespace-only draft when the chat is left, but not while typing', async () => {
    const { setDraft, getDraft, clearDraftIfBlank } = await loadStore();
    setDraft('chat1', '\n  \n');
    // Still in the chat: the whitespace is the user's to keep
    expect(getDraft('chat1')).toBe('\n  \n');

    clearDraftIfBlank('chat1');
    expect(getDraft('chat1')).toBe('');
  });

  it('keeps a draft that has content besides whitespace', async () => {
    const { setDraft, getDraft, clearDraftIfBlank } = await loadStore();
    setDraft('chat1', '\nhello\n');
    clearDraftIfBlank('chat1');
    expect(getDraft('chat1')).toBe('\nhello\n');
  });

  it('clears a sent chat draft', async () => {
    const { setDraft, getDraft, clearDraft } = await loadStore();
    setDraft('new:partner1', 'a request');
    clearDraft('new:partner1');
    expect(getDraft('new:partner1')).toBe('');
    expect(storage.has(STORAGE_KEY)).toBe(false);
  });

  it('flushes pending typing to localStorage', async () => {
    const { setDraft, flushDrafts } = await loadStore();
    setDraft('chat1', 'unsaved');
    flushDrafts();
    expect(stored()).toEqual({ chat1: 'unsaved' });
  });

  it('wipes every draft and the storage key on logout', async () => {
    const { setDraft, getDraft, wipeDrafts, DRAFT_PERSIST_DEBOUNCE } = await loadStore();
    setDraft('chat1', 'private');
    setDraft('chat2', 'also private');
    vi.advanceTimersByTime(DRAFT_PERSIST_DEBOUNCE);

    wipeDrafts();
    expect(getDraft('chat1')).toBe('');
    expect(getDraft('chat2')).toBe('');
    expect(storage.has(STORAGE_KEY)).toBe(false);
  });

  it('wipes storage even when typing is still pending', async () => {
    const { setDraft, wipeDrafts, DRAFT_PERSIST_DEBOUNCE } = await loadStore();
    setDraft('chat1', 'private');
    wipeDrafts();
    // The pending write must not resurrect the draft afterwards
    vi.advanceTimersByTime(DRAFT_PERSIST_DEBOUNCE);
    expect(storage.has(STORAGE_KEY)).toBe(false);
  });
});

describe('the draft on a chat list line', () => {
  it('shows the live draft of a chat that is not open', async () => {
    const { setDraft, getListedDraft } = await loadStore();
    setDraft('chat1', 'typed elsewhere');
    expect(getListedDraft('chat1')).toBe('typed elsewhere');
  });

  it('holds the line of the open chat while its draft is typed in', async () => {
    const { setDraft, getListedDraft, holdDraftListing } = await loadStore();
    setDraft('chat1', 'first version');

    // Opening the chat keeps its line as it was
    holdDraftListing('chat1');
    expect(getListedDraft('chat1')).toBe('first version');

    // Typing, and even emptying the box, leaves the line alone
    setDraft('chat1', 'first version, extended');
    expect(getListedDraft('chat1')).toBe('first version');
    setDraft('chat1', '');
    expect(getListedDraft('chat1')).toBe('first version');
  });

  it('re-decides the line when another chat is opened', async () => {
    const { setDraft, getListedDraft, holdDraftListing } = await loadStore();
    setDraft('chat1', 'first version');
    holdDraftListing('chat1');
    setDraft('chat1', 'edited');

    // Switching away from chat1 to chat2
    holdDraftListing('chat2');
    expect(getListedDraft('chat1')).toBe('edited');
  });

  it('re-decides the line when the chat is left altogether', async () => {
    const { setDraft, getListedDraft, holdDraftListing, releaseDraftListing } = await loadStore();
    setDraft('chat1', 'first version');
    holdDraftListing('chat1');
    setDraft('chat1', '');

    releaseDraftListing();
    expect(getListedDraft('chat1')).toBe('');
  });

  it('holds the line at the empty draft left after sending', async () => {
    const { setDraft, getListedDraft, holdDraftListing, clearDraft } = await loadStore();
    setDraft('chat1', 'about to be sent');
    holdDraftListing('chat1');

    // What send() does: drop the draft, then hold the line again
    clearDraft('chat1');
    holdDraftListing('chat1');
    expect(getListedDraft('chat1')).toBe('');

    // Typing a next message doesn't bring the line back either
    setDraft('chat1', 'and another thing');
    expect(getListedDraft('chat1')).toBe('');
  });

  it('shows restored drafts on page load, including for the chat that opens', async () => {
    storage.set(STORAGE_KEY, JSON.stringify({ chat1: 'restored' }));
    const { getListedDraft, holdDraftListing } = await loadStore();
    expect(getListedDraft('chat1')).toBe('restored');
    holdDraftListing('chat1');
    expect(getListedDraft('chat1')).toBe('restored');
  });
});
