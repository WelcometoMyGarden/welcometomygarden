import { writable, get, type Writable } from 'svelte/store';
import { getAllListedGardens } from '$lib/api/garden';
import type { Garden, MapGarden } from '../types/Garden';
import * as Sentry from '@sentry/sveltekit';
import logger from '$lib/util/logger';

export const hasLoaded = writable(false);
export const isUploading = writable(false);
export const uploadProgress = writable(0);
export const isFetchingGardens = writable(false);
/**
 * All listed gardens, as loaded from the precomputed listed gardens file.
 * Most entries don't carry garden details (description, photo): see {@link MapGarden}.
 */
export const allListedGardens: Writable<MapGarden[]> = writable([]);
export const filteredGardens: Writable<MapGarden[]> = writable([]);

/** Remove a garden from the local listed gardens store, if it is present. */
export const removeGardenLocally = (gardenId: string) => {
  if (get(allListedGardens).some((g) => g.id === gardenId)) {
    allListedGardens.update((gardens) => gardens.filter((g) => g.id !== gardenId));
  }
};

export const upsertInAllListedGardens = async (garden: Garden) => {
  // If the garden passed in is unlisted, and it is found in the listed gardens store
  // then remove it from the store
  if (!garden.listed) {
    removeGardenLocally(garden.id);
    return;
  }

  if (get(allListedGardens).length === 0 && !get(isFetchingGardens)) {
    try {
      await getAllListedGardens();
    } catch (ex) {
      logger.error(ex);
      Sentry.captureException(ex, {
        extra: { context: 'Fetching all listed gardens' }
      });
    }
  }
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
};
export const addGardenLocally = (garden: Garden) => upsertInAllListedGardens(garden);
export const updateGardenLocally = (garden: Garden) => upsertInAllListedGardens(garden);
