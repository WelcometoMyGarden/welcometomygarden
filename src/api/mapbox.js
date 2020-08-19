import {
    config
} from '@/config';

const {
    MAPBOX_ACCESS_TOKEN
} = config;

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
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${addressString}.json?limit=1&access_token=${MAPBOX_ACCESS_TOKEN}`, {
            headers
        }
    );
    const data = await response.json();
    const addressData = data.features[0];

    return {
        longitude: addressData.center[0],
        latitude: addressData.center[1]
    };
};

export const reverseGeocode = async ({
    latitude,
    longitude
}) => {
    const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?limit=1&access_token=${MAPBOX_ACCESS_TOKEN}`, {
            headers
        }
    );
    const data = await response.json();
    const addressData = data.features[0];

    let address = addressData.context.reduce(parseAddressPiece, {});
    // data includes one top-level feature
    address = parseAddressPiece(address, addressData);
    return address;
};

export const geocodeExtensive = async (place, longitude, latitude, language, amount) => {
    let types = "place,locality";
    const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${place}.json?proximity=${longitude},${latitude}&limit=${amount}&types=${types}&language=${language}&access_token=${MAPBOX_ACCESS_TOKEN}`, {
            headers
        }
    );
    const data = await response.json();

    if (data.features.length >= 1) {
        let addressData = [];
        for (var i = 0; i < data.features.length; i++) {
            const location = data.features[i];
            let locationData = {
                longitude: location.center[0],
                latitude: location.center[1],
                place_name: location.place_name
            }
            addressData.push(locationData);
        }
        return { 
            type: "succes",
            data: addressData 
        }
    }else{
        return { 
            type: "error",
            query: `${data.query[0]}` 
        }
    }
};