type PlausibleCommonEvent =
  | 'Show Hiking Routes'
  | 'Show Cycling Routes'
  | 'Show Garden Filter'
  | 'Visit Searched Location';
type PlausibleSuperfanEvent =
  | 'Set Garden Visibility'
  | 'Start Route Upload Flow'
  | 'Upload Route'
  | 'Save Garden'
  | 'Unsave Garden'
  | 'Show Train Network';

type PlausibleEvent = PlausibleSuperfanEvent | PlausibleCommonEvent;

type PlausibleCommonCustomProperties = {
  superfan: boolean;
};

type PlausibleVisibilityProperties = PlausibleCommonCustomProperties & {
  type: 'show_all' | 'show_saved' | 'hide_all';
};

type PlausibleCustomProperties = PlausibleCommonCustomProperties | PlausibleVisibilityProperties;

type Plausible = (eventName: PlausibleEvent, customProperties: PlausibleCustomProperties) => void;
declare interface Window {
  /**
   * Log a Plausible event with optional custom properties.
   * See app.html, and https://plausible.io/docs/custom-event-goals#trigger-custom-events-manually-with-a-javascript-function
   */
  plausible: Plausible;
}
