import { writable } from 'svelte/store';
import { slugify } from '../util';

type FileDataLayer = {
  name: string;
  id: string;
  geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature;
  visible?: boolean;
};

export const prefix = 'fileDataLayer-';

export const fileDataLayers = writable<FileDataLayer[]>([]);

export const addFileDataLayers = ({
  name,
  geoJson
}: {
  name: string;
  geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature;
}) => {
  fileDataLayers.update((layers) => [
    ...layers,
    <FileDataLayer>{
      name,
      id: prefix + slugify(name ?? (Math.random() + 1).toString(36).substring(7)),
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
