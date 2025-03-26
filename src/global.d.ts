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

type TallyPopupOptions = {
  key?: string;
  layout?: 'default' | 'modal';
  width?: number;
  alignLeft?: boolean;
  hideTitle?: boolean;
  overlay?: boolean;
  emoji?: {
    text: string;
    animation:
      | 'none'
      | 'wave'
      | 'tada'
      | 'heart-beat'
      | 'spin'
      | 'flash'
      | 'bounce'
      | 'rubber-band'
      | 'head-shake';
  };
  autoClose?: number;
  showOnce?: boolean;
  doNotShowAfterSubmit?: boolean;
  customFormUrl?: string;
  hiddenFields?: {
    [key: string]: any;
  };
  onOpen?: () => void;
  onClose?: () => void;
  onPageView?: (page: number) => void;
  onSubmit?: (payload: any) => void;
};

type Tally = {
  openPopup: (formId: string, options: TallyPopupOptions) => void;
  closePopup: (formid: string) => void;
};
declare interface Window {
  /**
   * Log a Plausible event with optional custom properties.
   * See app.html, and https://plausible.io/docs/custom-event-goals#trigger-custom-events-manually-with-a-javascript-function
   */
  plausible: Plausible;
  Tally: Tally;
}

// https://github.com/zerodevx/svelte-img#install
// Squelch warnings of image imports from your assets dir
declare module '$lib/assets/*' {
  const meta: Object[];
  export default meta;
}
// We also import some images from the following folder, so we apply the same:
declare module '$lib/images/*' {
  const meta: Object[];
  export default meta;
}
