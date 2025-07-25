export const SUPPORT_EMAIL = 'support@welcometomygarden.org';
export const mailToSupportHref = `mailto:${SUPPORT_EMAIL}`;
export const emailAsLink = `<a class="link" href="${mailToSupportHref}">${SUPPORT_EMAIL}</a>`;
export const SHOP_URL = 'https://shop.welcometomygarden.org/';
// Note: the help center URL is not here, since it is localized
export const SLOWBY_URL = 'https://slowby.travel';
export const DONATION_URL = 'https://donate.stripe.com/14k4kf26r2sjfLO3ce';
export const COMMUNITY_TRANSLATIONS_URL =
  'https://github.com/WelcometoMyGarden/welcometomygarden#translations';
export const COMMUNITY_FORUM_URL =
  (import.meta.env.VITE_DISCOURSE_HOST as string | undefined) ||
  'https://community.welcometomygarden.org';
export const WTMG_BLOG_BASE_URL = 'https://blog.welcometomygarden.org';
export const WTMG_UTM_SOURCE = 'welcometomygarden.org';
export const UTM_MEMBERSHIP_CAMPAIGN = 'membership';
export const DEFAULT_MAP_STYLE = 'mapbox://styles/mapbox/streets-v8';
export const STP_URL = 'https://slowtravelpass.com';
export const STP_TITLE = 'Slow Travel Pass';

export const LOCATION_BELGIUM = { longitude: 4.5, latitude: 50.5 };
export const LOCATION_WESTERN_EUROPE = {
  longitude: 4.818409187039379,
  latitude: 50.43017609488834
};
// https://docs.mapbox.com/help/glossary/zoom-level/
export const ZOOM_LEVELS = {
  CITY: 11,
  ROAD: 14, // 14 or 15
  SMALL_COUNTRY: 7,
  WESTERN_EUROPE: 5.2,
  BUILDING: 19,
  // This is the MapBox default https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters
  MAX: 22
};
export const VALID_FILETYPE_EXTENSIONS = ['gpx', 'geojson', 'kml', 'tcx'];
// mimetypes
// see https://stackoverflow.com/questions/74476589/what-is-gpx-mime-type
export const EXTRA_ACCEPT_VALUES = ['application/gpx+xml', 'application/geo+json'];
export const ICON_SIZE = [
  'interpolate',
  ['linear'],
  ['zoom'],
  0,
  0.2,
  ZOOM_LEVELS.SMALL_COUNTRY,
  0.3,
  ZOOM_LEVELS.CITY,
  0.4,
  ZOOM_LEVELS.ROAD,
  0.4
];

export const IMAGES_PATH = '/images';

/**
 * MapBox max zoom level for non-members, in order to preserve privacy
 */
export const nonMemberMaxZoom = 12;
export const memberMaxZoom = ZOOM_LEVELS.MAX;

export const MAX_GARDEN_CAPACITY = 100;

export const NOTIFICATION_PROMPT_DISMISSED_COOKIE = 'notif_dismissed';

// In EUR
export const MEMBERSHIP_YEARLY_AMOUNTS: { [key: string]: number } = {
  [import.meta.env.VITE_STRIPE_PRICE_ID_REDUCED]: 36,
  [import.meta.env.VITE_STRIPE_PRICE_ID_NORMAL]: 60,
  [import.meta.env.VITE_STRIPE_PRICE_ID_SOLIDARITY]: 120
};
