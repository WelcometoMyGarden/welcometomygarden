import type { Readable } from 'svelte/store';
import type { _ } from 'svelte-i18n';
// Conditional inference, to extract the MessageFormatter type of the formatter store
type Flatten<T> = T extends Readable<infer U> ? U : T;
export type MessageFormatter = Flatten<typeof _>;
import { UTM_MEMBERSHIP_CAMPAIGN, WTMG_BLOG_BASE_URL } from '$lib/constants';
import createUrl from './create-url';
import { goto } from './navigate';
import trackEvent from './track-plausible';

if (window) {
  // This function is referenced below in the inline onclick handler.
  //
  // We need to override the default href with a programmatic Svelte goto,
  // because the Svelte compiler otherwise doesn't detect & handle the href inside the text.
  //
  // Using Svelte SPA navigation over browser-native nav is desirable because of:
  // - speed: don't load resources again/rerun JS
  // - ability to listen in on onpopstate to detect back navigation
  window.wtmgAnchorNav = (e: MouseEvent, plausibleParams: Parameters<typeof trackEvent>) => {
    const ev = e || window.event;
    if (ev.target?.href) {
      // Warning: AnchorHtml.href returns the full URL despite a relative URl attribute.
      const rawHref = ev.target?.getAttribute('href');
      // https://stackoverflow.com/questions/10687099/how-to-test-if-a-url-string-is-absolute-or-relative
      const absUrlRegex = new RegExp('^(?:[a-z+]+:)?//', 'i');
      const isRelative = !absUrlRegex.test(rawHref);

      if (!isRelative) {
        // TODO: support tracking here too?
        // do nothing, allow native nav & newtab handling
        return;
      }

      // Prevent the browser default nav on a local/relative URL nav
      ev.preventDefault();

      if (plausibleParams) {
        trackEvent(...plausibleParams);
      }
      // Override with Svelte programmatic navigation
      // TODO: support newtab behavior?
      goto(rawHref);
    }
  };
}

export const anchorText = (props: {
  href: string;
  linkText: string;
  noopener?: boolean;
  noreferrer?: boolean;
  newtab?: boolean;
  style?: string;
  class?: string;
  /**
   * The event to track. Be careful to include only valid custom props.
   */
  track?: Parameters<typeof trackEvent>;
}) => {
  const defaults = {
    noopener: true,
    noreferrer: false,
    newtab: true
  };
  const {
    href,
    linkText,
    noopener,
    noreferrer,
    newtab,
    style,
    class: className,
    track
  } = { ...defaults, ...props };

  // &quot; seems to work best for inlining the object https://stackoverflow.com/a/1081581/4973029
  const htmlInlineablePlausibleParamsArray = (params: Parameters<typeof trackEvent>): string =>
    JSON.stringify(params).replaceAll('"', '&quot;');

  // Docs for the onclick="wtmgAnchorNav(event);"
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes#event_handler_attributes
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/event
  // https://stackoverflow.com/a/56271211/4973029
  // https://stackoverflow.com/questions/7056669/how-to-prevent-default-event-handling-in-an-onclick-method#comment130547060_15429528
  //
  // This is a little risky (deprecated), the alternative is working somehow with dynamically generating link IDs.
  // the problem is that we still need a reference to the event to preventDefault() it (except if the "return false" method works well)
  // We can not easily set up an event listener programatically (we can't easily hook into when Svelte renders this textual HTML),
  // solutions would be working with a global window click capture handler (using event propagation?), or DOM modification observer.
  //
  //
  return `<a href="${href}" onclick="wtmgAnchorNav(event, ${
    track ? htmlInlineablePlausibleParamsArray(track) : 'undefined'
  });" target="${newtab ? '_blank' : '_self'}" rel="${noopener ? 'noopener' : ''} ${
    noreferrer ? 'noreferrer' : ''
  }" style="${style ?? ''}" class="${className ?? ''}">${linkText}</a>`;
};

export const membershipBlogLink = (
  t: MessageFormatter,
  { utm_campaign, utm_content }: { utm_campaign?: string; utm_content?: string }
) => {
  const params = {
    utm_source: 'welcometomygarden.org',
    utm_medium: 'web',
    ...(utm_campaign ? { utm_campaign } : { utm_campaign: UTM_MEMBERSHIP_CAMPAIGN }),
    ...(utm_content ? { utm_content } : undefined)
  };

  return createUrl(`${WTMG_BLOG_BASE_URL}${t('generics.fair-model-blog-path')}`, params);
};
