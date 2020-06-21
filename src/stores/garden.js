import { writable } from 'svelte/store';

export const isUploading = writable(false);
export const uploadProgress = writable(0);
export const isFetchingGardens = writable(false);
export const allGardens = writable(null);
