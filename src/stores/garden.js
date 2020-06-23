import { writable } from 'svelte/store';

export const isUploading = writable(false);
export const uploadProgress = writable(0);
export const isFetchingGardens = writable(true);
export const allGardens = writable({});

export const addGardenLocally = (garden) => {
  allGardens.update((gardens) => ({ ...gardens, [garden.id]: garden }));
};

export const updateGardenLocally = (garden) => {
  allGardens.update((gardens) => ({ ...gardens, [garden.id]: garden }));
};
