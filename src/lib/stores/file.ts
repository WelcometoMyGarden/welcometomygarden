import { get, writable } from 'svelte/store';
import type { FileDataLayer } from '../types/DataLayer';
import { slugify } from '../util';

export const prefix = 'fileDataLayer-';

export const fileDataLayers = writable<FileDataLayer[]>([]);

export const addFileDataLayers = ({
  name,
  geoJson
}: {
  name: string;
  geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature;
}) => {
  const id = prefix + slugify(name ? name : (Math.random() + 1).toString(36).substring(7));

  const checkIndex = get(fileDataLayers).findIndex((layer) => layer.id === id);

  if (checkIndex !== -1) throw new Error('FileDataLayer with id ' + id + ' already exists');
  else
    fileDataLayers.update((layers) => [
      ...layers,
      <FileDataLayer>{
        name,
        id,
        geoJson,
        visible: true
      }
    ]);
};

export const removeFileDataLayers = (id: string) => {
  fileDataLayers.update((layers) => layers.filter((layer) => layer.id !== id));
};

export const updateFileDataLayers = (id: string, fileDataLayer: FileDataLayer) => {
  fileDataLayers.update((layers) =>
    layers.map((layer) => (layer.id === id ? { ...layer, ...fileDataLayer } : layer))
  );
};

export const toggleVisibilityFileDataLayers = (id: string) => {
  fileDataLayers.update((layers) =>
    layers.map((layer) => (layer.id === id ? { ...layer, visible: !layer.visible } : layer))
  );
};
