export interface Station {
  id: string;
  name: string;
  location: {
    type: 'location';
    id: string;
    latitude: number;
    longitude: number;
  };
  duration: number;
}
