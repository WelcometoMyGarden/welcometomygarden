/**
 * Data stores for trail/track files
 */
import { get, writable } from 'svelte/store';
import type { FileDataLayer } from '../types/DataLayer';
export const prefix = 'fileDataLayer-';

export const fileDataLayers = writable<FileDataLayer[]>([]);

export const findFileDataLayer = (id: string) =>
  get(fileDataLayers).find((layer) => layer.id === id);

/**
 * @param md5Hash the hex string of the MD5 hash of the file
 */
export const findFileDataLayerByMD5Hash = (md5Hash: string) =>
  get(fileDataLayers).find((layer) => layer.md5Hash === md5Hash);

export const addFileDataLayers = async (trail: FileDataLayer) => {
  const checkIndex = get(fileDataLayers).findIndex((layer) => layer.id === trail.id);

  if (checkIndex !== -1) {
    throw new Error('FileDataLayer with id ' + trail.id + ' already exists');
  } else {
    fileDataLayers.update((layers) => [...layers, trail]);
  }
};

export const removeFileDataLayers = async (id: string) => {
  // Remove the local file in any case
  fileDataLayers.update((layers) => layers.filter((layer) => layer.id !== id));
};

export const updateFileDataLayers = (id: string, fileDataLayer: Partial<FileDataLayer>) => {
  fileDataLayers.update((layers) =>
    layers.map((layer) => (layer.id === id ? { ...layer, ...fileDataLayer } : layer))
  );
};

export const removeTrailAnimations = () => {
  fileDataLayers.update((layers) =>
    layers.map((layer) => (layer.animate ? { ...layer, animate: false } : layer))
  );
};
