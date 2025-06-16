import type { LocalTrail } from './Trail';

type DataLayer = {
  id: string;
  visible?: boolean;
};

export type FileDataLayer = LocalTrail & {
  geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature;
};
