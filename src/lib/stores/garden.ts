import { writable, get, type Writable } from 'svelte/store';
import { getAllListedGardens } from '$lib/api/garden';
import type { Garden } from '../types/Garden';

export const hasLoaded = writable(false);
export const isUploading = writable(false);
export const uploadProgress = writable(0);
export const isFetchingGardens = writable(false);
export const allGardens: Writable<Garden[]> = writable([]);

export const addToAllGardens = async (garden: Garden) => {
  if (get(allGardens).length === 0 && !get(isFetchingGardens)) {
    isFetchingGardens.set(true);
    try {
      await getAllListedGardens();
    } catch (ex) {
      console.log(ex);
      isFetchingGardens.set(false);
    }
    isFetchingGardens.set(false);
  } else {
    // Update the the specific garden in the local store of gardens
    allGardens.update((gardens) => {
      const index = gardens.findIndex((g) => g.id === garden.id);
      if (typeof index === 'number') {
        gardens[index] = garden;
      } else {
        gardens.push(garden);
      }
      return gardens;
    });
  }
};
export const addGardenLocally = (garden: Garden) => addToAllGardens(garden);
export const updateGardenLocally = (garden: Garden) => addToAllGardens(garden);
