import { writable, get, type Writable } from 'svelte/store';
import { getAllListedGardens } from '$lib/api/garden';
import type { Garden } from '../types/Garden';
import * as Sentry from '@sentry/sveltekit';

export const hasLoaded = writable(false);
export const isUploading = writable(false);
export const uploadProgress = writable(0);
export const isFetchingGardens = writable(false);
export const allListedGardens: Writable<Garden[]> = writable([]);

export const upsertInAllListedGardens = async (garden: Garden) => {
  // If the garden passed in is unlisted, and it is found in the listed gardens store
  // then remove it from the store
  if (!garden.listed) {
    const index = get(allListedGardens).findIndex((g) => g.id === garden.id);
    if (index > -1) {
      allListedGardens.update((gardens) => gardens.filter((_, i) => i !== index));
    }
    return;
  }

  if (get(allListedGardens).length === 0 && !get(isFetchingGardens)) {
    isFetchingGardens.set(true);
    try {
      await getAllListedGardens();
    } catch (ex) {
      console.error(ex);
      Sentry.captureException(ex, {
        extra: { context: 'Fetching all listed gardens' }
      });
      isFetchingGardens.set(false);
    }
    isFetchingGardens.set(false);
  } else {
    // Update the the specific garden in the local store of gardens
    allListedGardens.update((gardens) => {
      const index = gardens.findIndex((g) => g.id === garden.id);
      if (index > -1) {
        gardens[index] = garden;
      } else {
        gardens.push(garden);
      }
      return gardens;
    });
  }
};
export const addGardenLocally = (garden: Garden) => upsertInAllListedGardens(garden);
export const updateGardenLocally = (garden: Garden) => upsertInAllListedGardens(garden);
