import { writable, get } from 'svelte/store';
import { getAllListedGardens } from '@/lib/api/garden';

export const isUploading = writable(false);
export const uploadProgress = writable(0);
export const isFetchingGardens = writable(true);
export const allGardens = writable({});

export const addToAllGardens = async (garden) => {
  if (Object.keys(get(allGardens)).length === 0) {
    isFetchingGardens.set(true);
    try {
      await getAllListedGardens();
    } catch (ex) {
      console.log(ex);
      isFetchingGardens.set(false);
    }
    isFetchingGardens.set(false);
  } else {
    allGardens.update((gardens) => ({ ...gardens, [garden.id]: garden }));
  }
};
export const addGardenLocally = (garden) => addToAllGardens(garden);
export const updateGardenLocally = (garden) => addToAllGardens(garden);
