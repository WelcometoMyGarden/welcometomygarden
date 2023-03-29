type Plausible = (
  eventName: string,
  options?: {
    props?: import('./lib/types/Plausible').PlausibleCustomProperties;
    /**
     * A function that is called once the event is logged successfully
     */
    callback?: () => void;
  }
) => void;
declare interface Window {
  /**
   * Log a Plausible event with optional custom properties.
   * See app.html, and https://plausible.io/docs/custom-event-goals#trigger-custom-events-manually-with-a-javascript-function
   */
  plausible: Plausible;
}
