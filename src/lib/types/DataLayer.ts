type DataLayer = {
  name: string;
  id: string;
  geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature;
  visible?: boolean;
};

export type FileDataLayer = DataLayer;
export type TrainconnectionsDataLayer = DataLayer;
