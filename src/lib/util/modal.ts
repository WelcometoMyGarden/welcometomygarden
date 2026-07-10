import { bind as bindUntyped } from 'svelte-simple-modal';
import type { Component } from 'svelte';

/**
 * svelte-simple-modal (v2) still ships legacy `typeof SvelteComponent` types for
 * `bind`/`show`/`open`, even though its runtime supports Svelte 5 function components
 * (see https://github.com/flekschas/svelte-simple-modal). Passing a Svelte 5
 * `Component<Props>` therefore fails to type-check against those legacy class types.
 *
 * This wrapper re-types `bind` with Svelte 5's `Component` so all our modal call
 * sites (which store the result in `rootModal`, a `Component | null` store) line up.
 * The `+layout.svelte` `<Modal show={...}>` binding still expects the library's own
 * legacy type and is cast there.
 */
export const bind = bindUntyped as unknown as (
  component: Component<any>,
  props: Record<string, any>
) => Component;
