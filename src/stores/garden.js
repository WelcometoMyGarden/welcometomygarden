import { writable } from 'svelte/store';

const isUploading = writable(false);
const uploadProgress = writable(0);

export { isUploading, uploadProgress };
