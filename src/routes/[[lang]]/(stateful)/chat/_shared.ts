/**
 * How long the empty state fades when a conversation card appears/disappears
 * within the current view (e.g. the last chat is archived elsewhere). The card
 * that replaces the empty state waits this long before revealing itself, so the
 * two never overlap.
 *
 * During a view switch (all ↔ archived) the empty state instead fades in
 * lockstep with the surrounding list wrapper — see `VIEW_FADE_DURATION` in the
 * chat layout — so the parent overrides this with the shorter value there.
 */
export const EMPTY_FADE_DURATION = 350;
