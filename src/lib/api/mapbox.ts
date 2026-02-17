export type Address = {
  street: string;
  postalCode: string;
  region: string;
  country: string;
  city: string;
  houseNumber: string;
};

const { VITE_MAPBOX_ACCESS_TOKEN } = import.meta.env;

const headers = {
  'Content-Type': 'application/json'
};

/**
 * Mutates the argument
 */
const parseAddressContextPiece = (address: Partial<Address>, piece: AddressContextPiece) => {
  // See the "features" docs here https://docs.mapbox.com/api/search/geocoding-v5/#geocoding-response-object
  // Observed fact: piece.id being {type}.{unstable_id} is more reliable than place_type: type[]. The latter is often not included (postcode, ...)
  if (!piece.id || !piece.text) return address;
  // These two are alternatives that represent street names
  if (piece.id.includes('street')) address.street = piece.text;
  // Others
  if (piece.id.includes('postcode')) address.postalCode = piece.text;
  if (piece.id.includes('place')) address.city = piece.text;
  if (piece.id.includes('region')) address.region = piece.text;
  if (piece.id.includes('country')) address.country = piece.text;
  return address as Partial<Address>;
};

export const lnglatToObject = ([lng, lat]: [number, number]) => ({
  longitude: lng,
  latitude: lat
});

export const objectToLngLat = ({
  longitude,
  latitude
}: {
  longitude: number;
  latitude: number;
}) => [longitude, latitude];

export const geocode = async (addressString: string) => {
  // See response format: https://docs.mapbox.com/api/search/geocoding-v5/#geocoding-response-object
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${addressString}.json?limit=1&access_token=${VITE_MAPBOX_ACCESS_TOKEN}`,
    { headers }
  );
  const data = await response.json();
  const addressData = data.features[0];

  return { longitude: addressData.center[0], latitude: addressData.center[1] };
};

type AddressContextPiece = {
  id: string;
  text: string;
};

export const reverseGeocode = async ({
  latitude,
  longitude
}: {
  latitude: number;
  longitude: number;
}): Promise<Partial<Address>> => {
  // Response format: https://docs.mapbox.com/api/search/geocoding-v5/#geocoding-response-object
  // See especially the "features" documentation.
  // > Reverse geocodes: Returned features are ordered by index hierarchy, from most specific features to least specific features that overlap the queried coordinates.
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?limit=1&access_token=${VITE_MAPBOX_ACCESS_TOKEN}`,
    { headers }
  );
  const data = await response.json();

  // A feature contains some useful info about the address, and multiple information pieces
  // in the context, zooming out from most specific (locality) to least specific (country)
  // TODO: try putting this in the sea?
  const addressData = data.features[0] as {
    id: string;
    /**
     * House number, optional
     */
    address?: string;
    text: string;
  } & {
    context: AddressContextPiece[];
  };

  // First parse the context
  const address = addressData.context.reduce(parseAddressContextPiece, {});
  // Insert top-level properties
  if (!address.street) {
    // Override the street with the top-level text if street context didn't exist
    address.street = addressData.text;
  }
  if (addressData.address) {
    // Add the house number if it exists
    address.houseNumber = addressData.address;
  }
  return address;
};

export const geocodeExtensive = async (
  place: string,
  longitude: number,
  latitude: number,
  language: string,
  amount: number
) => {
  const types = 'place,locality';
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${place}.json?proximity=${longitude},${latitude}&limit=${amount}&types=${types}&language=${language}&access_token=${VITE_MAPBOX_ACCESS_TOKEN}`,
    {
      headers
    }
  );
  const data = await response.json();

  if (data.features.length >= 1) {
    const addressData = [];
    for (let i = 0; i < data.features.length; i++) {
      const location = data.features[i];
      const locationData = {
        longitude: location.center[0],
        latitude: location.center[1],
        place_name: location.place_name
      };
      addressData.push(locationData);
    }
    return {
      type: 'succes',
      data: addressData
    };
  } else {
    return {
      type: 'error',
      query: `${data.query[0]}`
    };
  }
};

export const geocodeCountryCode = async (country_code: string) => {
  try {
    const types = 'country';
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${country_code}.json?&limit=1&autocomplete=false&types=${types}&access_token=${VITE_MAPBOX_ACCESS_TOKEN}`,
      {
        headers
      }
    );
    if (!response.ok) return;
    const data = await response.json();

    const location = data.features[0];
    const locationData = {
      longitude: location.center[0],
      latitude: location.center[1],
      place_name: location.place_name
    };
    return locationData;
  } catch {
    return;
  }
};

export const loadImg = (map: mapboxgl.Map, { url, id }: { url: string; id: string }) =>
  new Promise((resolve) => {
    map.loadImage(url, (error, res) => {
      map.addImage(id, res);
      resolve(true);
    });
  });
