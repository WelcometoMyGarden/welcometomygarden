type DataLayer = {
  id: string;
  visible?: boolean;
};

export type OriginStation = {
  location: { longitude: number; latitude: number };
  name: string;
  id: number;
};

export type TrainconnectionsDataLayer = DataLayer & {
  originStation: OriginStation;
};

export type FileDataLayer = DataLayer & {
  name: string;
  geoJson: GeoJSON.FeatureCollection | GeoJSON.Feature;
};
