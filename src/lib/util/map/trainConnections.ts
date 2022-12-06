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
