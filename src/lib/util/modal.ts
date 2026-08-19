import ModalUntyped, { bind as bindUntyped } from 'svelte-simple-modal';
import type { Component, ComponentProps, Snippet } from 'svelte';

/**
 * svelte-simple-modal (v2) still ships legacy `typeof SvelteComponent` types for
 * `bind`/`show`/`open`, even though its runtime supports Svelte 5 function components
 * (see https://github.com/flekschas/svelte-simple-modal). Passing a Svelte 5
 * `Component<Props>` therefore fails to type-check against those legacy class types.
 *
 * This wrapper re-types `bind` with Svelte 5's `Component` so all our modal call
 * sites (which store the result in `rootModal`, a `Component | null` store) line up.
 */
export const bind = bindUntyped as unknown as (
  component: Component<any>,
  props: Record<string, any>
) => Component;

/**
 * The same mismatch applies to the `<Modal show={...}>` component itself: its `show`
 * prop is typed as the library's legacy class type, while `rootModal` holds a Svelte 5
 * `Component`. Re-type just that prop (and the default slot, which the legacy
 * declaration doesn't expose as a snippet) and keep the rest of the props as shipped.
 */
export const Modal = ModalUntyped as unknown as Component<
  Omit<ComponentProps<ModalUntyped>, 'show'> & {
    show?: Component | null;
    children?: Snippet;
  }
>;
