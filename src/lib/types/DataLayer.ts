import type { LocalTrail } from './Trail';

export type FileDataLayer = LocalTrail & {
  geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature;
};
