import { config } from '@/config';

const { VITE_MAPBOX_ACCESS_TOKEN } = config;

const headers = {
  'Content-Type': 'application/json'
};

const parseAddressPiece = (address, piece) => {
  if (!piece.id || !piece.text) return address;
  if (piece.id.includes('street')) address.street = piece.text;
  if (piece.id.includes('address') && !address.street) address.street = piece.text;
  if (piece.id.includes('postcode')) address.postalCode = piece.text;
  if (piece.id.includes('place')) address.city = piece.text;
  if (piece.id.includes('region')) address.region = piece.text;
  if (piece.id.includes('country')) address.country = piece.text;
  return address;
};

export const geocode = async (addressString) => {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${addressString}.json?limit=1&access_token=${VITE_MAPBOX_ACCESS_TOKEN}`,
    { headers }
  );
  const data = await response.json();
  const addressData = data.features[0];

  return { longitude: addressData.center[0], latitude: addressData.center[1] };
};

export const reverseGeocode = async ({ latitude, longitude }) => {
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?limit=1&access_token=${VITE_MAPBOX_ACCESS_TOKEN}`,
    { headers }
  );
  const data = await response.json();
  const addressData = data.features[0];

  let address = addressData.context.reduce(parseAddressPiece, {});
  // data includes one top-level feature
  address = parseAddressPiece(address, addressData);
  return address;
};
