import { writable, get, type Writable } from 'svelte/store';
import { getAllListedGardens } from '$lib/api/garden';
import type { Garden } from '../types/Garden';

export const isUploading = writable(false);
export const uploadProgress = writable(0);
export const isFetchingGardens = writable(true);
export const allGardens: Writable<Garden[]> = writable([]);

export const addToAllGardens = async (garden: Garden) => {
  // TODO: length 0 doesn't strictly  mean that the gardens are not fetched
  if (get(allGardens).length === 0) {
    isFetchingGardens.set(true);
    try {
      await getAllListedGardens();
    } catch (ex) {
      console.log(ex);
      isFetchingGardens.set(false);
    }
    isFetchingGardens.set(false);
  } else {
    allGardens.update((gardens) => {
      const index = gardens.findIndex((g) => g.id === garden.id);
      if (index) {
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
