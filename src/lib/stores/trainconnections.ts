import { get, writable } from 'svelte/store';
import type { OriginStation, TrainconnectionsDataLayer } from '../types/DataLayer';
import { slugify } from '../util';

export const prefix = 'trainconnections-';

export const trainconnectionsDataLayers = writable<TrainconnectionsDataLayer[]>([]);

export const addTrainconnectionsDataLayers = (originStation: OriginStation) => {
  const id = prefix + slugify(originStation.id, '-', originStation.name);

  const checkIndex = get(trainconnectionsDataLayers).findIndex((layer) => layer.id === id);

  if (checkIndex !== -1)
    throw new Error('TrainconnectionsDataLayer with id ' + id + ' already exists');
  else
    trainconnectionsDataLayers.update((layers) => [
      ...layers,
      <TrainconnectionsDataLayer>{
        originStation,
        id,
        visible: true
      }
    ]);
};

export const removeTrainconnectionsDataLayers = (id: string) => {
  trainconnectionsDataLayers.update((layers) => layers.filter((layer) => layer.id !== id));
};

export const updateTrainconnectionsDataLayers = (
  id: string,
  trainconnectionsDataLayer: TrainconnectionsDataLayer
) => {
  trainconnectionsDataLayers.update((layers) =>
    layers.map((layer) => (layer.id === id ? { ...layer, ...trainconnectionsDataLayer } : layer))
  );
};
