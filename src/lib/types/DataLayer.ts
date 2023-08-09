import type { LocalTrail } from './Trail';

type DataLayer = {
  id: string;
  visible?: boolean;
};

/**
 * TODO: this is unused, and may be broken now
 */
export type OriginStation = {
  location: { longitude: number; latitude: number };
  name: string;
  id: number;
};

export type TrainconnectionsDataLayer = DataLayer & {
  originStation: OriginStation;
};

export type FileDataLayer = LocalTrail & {
  geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature;
};
