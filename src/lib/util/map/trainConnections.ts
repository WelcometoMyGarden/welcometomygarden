import type { Station } from '@/lib/types/Station';
import isUicLocationCode from 'is-uic-location-code';

export const fetchStation = async (query: string): Promise<any> => {
  const urls = ['https://v5.db.transport.rest', 'https://v5.db.juliustens.eu'];
  if (!urls.length) throw new Error('No API URLs provided');
  const fetchUrls = urls.map((url) =>
    fetch(new URL(`${url}/locations?poi=false&addresses=false&query=${query}`))
  );

  const resp = await Promise.any<any>(fetchUrls);
  return await resp.json();
};

export const isLongDistanceOrRegionalOrSuburban = (s) => {
  return (
    s.products &&
    (s.products.nationalExp ||
      s.products.nationalExpress ||
      s.products.national ||
      s.products.regionalExp ||
      s.products.regionalExpress ||
      s.products.regional ||
      s.products.suburban) &&
    isUicLocationCode(formatStationId(s.id))
  );
};

export const formatStationId = (i: string) => (i.length === 9 && i.slice(0, 2) ? i.slice(2) : i);

export const isRegion = (s) => {
  return s.name.toUpperCase() === s.name;
};

export const hasLocation = (s) => {
  return !!s.location;
};

export const toPoint = () => (station) => ({
  ...station,
  id: formatStationId(station.id)
});

export const apiUrls = <string>import.meta.env.VITE_DIRECT_TRAIN_API_URLS;

export const fetchDirectConnections = async (id: string): Promise<Station[]> => {
  const urls = apiUrls ? apiUrls.split(',') : [];
  if (!urls.length) throw new Error('No API URLs provided');
  // const urlA = new URL(`https://api.direkt.bahn.guru/${formatStationId(id)}`);

  const fetchUrls = urls.map((url) => fetch(new URL(`${url}/${formatStationId(id)}`)));

  const resp = await Promise.any<any>(fetchUrls);
  return await resp.json();
};

export const createPopupHtml = (properties: any) => {
  const { name, duration, durationMinutes, type, fromName } = properties;
  if (type == 2)
    return `
  <div>
    <div class="dtc-popup-text">
      <span>${fromName}</span>
      <span>&#8594</span>
      <span>${name}</span>
    </div>
    <div class="dtc-popup-tag">~ ${durationMinutes} min.</div>
  </div>`;
  else return name;
};

export const locationToPoint = (location: { longitude: number; latitude: number }): GeoJSON.Point => ({
  type: 'Point',
  coordinates: [location.longitude, location.latitude]
});

export const durationCategory = (d: number): number => {
  if (d === 0) return 0;
  if (!d) return -1;
  if (d > 0 && d <= 60) return 1;
  if (d > 0 && d <= 120) return 2;
  if (d > 0 && d <= 240) return 3;
  if (d > 0 && d <= 480) return 4;
  if (d > 0 && d <= 960) return 5;
  return 6;
};

export const durationCategoryColour = (c: number) => {
  if (c === -1) return '#999'; // unknown duration
  if (c === 0) return '#333'; // 0
  if (c === 1) return '#191'; // < 1h
  if (c === 2) return '#2d1'; // 1h-2h
  if (c === 3) return '#d4d411'; // 2h-4h
  if (c === 4) return '#d91'; // 4h-8h
  if (c === 5) return '#d41'; // 8h-16h
  if (c === 6) return '#a41'; // > 16h
  return '#999';
};

export const convertToFeatureList = (stations: Station[], fromStationName: string): GeoJSON.Feature[] => {
  const resultsWithLocations = stations
    .map((s) => ({
      ...s,
      location: s.location
    }))
    .filter((s) => !!s.location);

  const features: GeoJSON.Feature[] = resultsWithLocations
    .map(
      (s): GeoJSON.Feature => ({
        type: 'Feature',
        geometry: locationToPoint(s.location),
        properties: {
          type: 2,
          name: s.name,
          fromName: fromStationName,
          duration: durationCategory(s.duration),
          durationMinutes: s.duration
        }
      })
    )
    .sort((a, b) => a.properties?.duration - b.properties?.duration);

  return features;
};
