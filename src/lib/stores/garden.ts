import { writable, get, type Writable } from 'svelte/store';
import { getAllListedGardens } from '$lib/api/garden';
import type { GardenWithId } from '../types/Garden';

export const isUploading = writable(false);
export const uploadProgress = writable(0);
export const isFetchingGardens = writable(true);
export const allGardens: Writable<{ [id: string]: GardenWithId }> = writable({});

export const addToAllGardens = async (garden: GardenWithId) => {
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
export const addGardenLocally = (garden: GardenWithId) => addToAllGardens(garden);
export const updateGardenLocally = (garden: GardenWithId) => addToAllGardens(garden);
