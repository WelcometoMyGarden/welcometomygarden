export const getLocationFromIp = async () => {
  try {
    const response = await fetch(`https://geolocation-db.com/json/`);
    if (!response.ok) return;

    const data = await response.json();

    return {
      longitude: data.longitude,
      latitude: data.latitude
    };
  } catch {
    return;
  }
};
