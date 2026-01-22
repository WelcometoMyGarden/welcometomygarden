import { MOBILE_BREAKPOINT } from '$lib/constants';
import { innerWidth } from 'svelte/reactivity/window';

// Svelte 5 reactive shared state

let _isMobile = $derived(innerWidth.current && innerWidth.current <= MOBILE_BREAKPOINT);

export function isMobile() {
  return _isMobile;
}
