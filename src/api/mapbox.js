import config from '@/wtmg.config';

const { MAPBOX_ACCESS_TOKEN } = config;

const headers = {
  'Content-Type': 'application/json'
};

export const reverseGeocode = async ({ latitude, longitude }) => {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?limit=1&access_token=${MAPBOX_ACCESS_TOKEN}`,
    { headers }
  );
  const data = await response.json();
  const addressData = data.features[0];
  const address = {};
  if (addressData.text) address.street = addressData.text;
  addressData.context.forEach((piece) => {
    if (piece.id && piece.id.includes('postcode')) address.postalCode = piece.text;
    if (piece.id && piece.id.includes('place')) address.city = piece.text;
    if (piece.id && piece.id.includes('region')) address.region = piece.text;
    if (piece.id && piece.id.includes('country')) address.country = piece.text;
  });
  return address;
};
