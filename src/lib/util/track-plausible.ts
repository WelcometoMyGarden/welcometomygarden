// NOTE: the filename of this file used to be "track-event.ts", but in some @sveltejs/kit@>1.0.0 version,
// this started bundling to /_app/immutable/chunks/track-event.edc71b85.js (or similar), which is blocked by the EasyPrivacy rule "/track-event.":
// https://github.com/easylist/easylist/blob/55a90a03050c5a278c1497d8443143dfd3d8810f/easyprivacy/easyprivacy_general.txt#L3150
// Previously, the chuck would have been named /track-event-edc71b85.js, which doesn't match the rule due to the '-' instead of the '.'
//
// Do not name it track-event again.
import { dev } from '$app/environment';
import { user } from '$lib/stores/auth';
import {
  isNonsuperfanOnlyEvent,
  isSuperfanOnlyEvent,
  PlausibleEvent,
  type PlausibleCustomProperties,
  type PlausibleGardenVisibilityProperties,
  type PlausibleResponseRoleProperties,
  type PlausibleSubscriptionProperties,
  type PlausibleMembershipModalProperties,
  type PlausibleVisitAboutMembershipProperties,
  type PlausibleContinueWithPriceProperties,
  type PlausiblePricingSectionSourceProperties,
  type PlausibleMembershipModalBackNavSource
} from '$lib/types/Plausible';
import { debounce } from 'lodash-es';
import { get } from 'svelte/store';

type Callable = (eventName: PlausibleEvent, customProperties?: PlausibleCustomProperties) => void;

const debouncedLoggers: { [key in PlausibleEvent]?: Callable } = {};

const logToPlausible = (
  eventName: PlausibleEvent,
  customProperties?: PlausibleCustomProperties
) => {
  const concreteUser = get(user);
  // Don't log the superfan custom property if it can be derived from the event.
  // TODO: this distinction was made obsolete by the Plausible <script> property based `superfan`
  // property tracking, which applies always. Normally it should be possible to remove the custom property here
  // and remove the distinction in event types. If we still want to save a little bit of data by
  // not logging obvious/implied event properties, we need to manually track page views.
  const superfanProperty: { superfan?: boolean } =
    isSuperfanOnlyEvent(eventName) || isNonsuperfanOnlyEvent(eventName)
      ? {}
      : { superfan: concreteUser ? !!concreteUser.superfan : false };

  const options = {
    props: { ...superfanProperty, ...customProperties }
  };
  if (dev) {
    console.log(`Log attempt to Plausible: ${eventName} ${JSON.stringify(options)}`);
  } else {
    window.plausible(eventName, options);
  }
};

/**
 * @param name - the event name (type)
 * @param props - props that should or can describe the event further
 * @param trailing - whether the internal debouncer should send the first request,
 *          and ignore similar events in the timeframe of 5 seconds (false, default),
 *          or whether it should wait with sending and send the last received
 *          event within the timeframe (true).
 */
function trackEvent(
  name: PlausibleEvent.SET_GARDEN_VISIBILITY,
  props: PlausibleGardenVisibilityProperties & PlausibleCustomProperties,
  trailing?: boolean
): void;
function trackEvent(
  name: PlausibleEvent.SEND_RESPONSE,
  props: PlausibleResponseRoleProperties & PlausibleCustomProperties,
  trailing?: boolean
): void;
function trackEvent(
  name: PlausibleEvent.EMAIL_RESUBSCRIBE | PlausibleEvent.EMAIL_UNSUBSCRIBE,
  props: PlausibleSubscriptionProperties & PlausibleCustomProperties
): void;
function trackEvent(
  name: PlausibleEvent.OPEN_MEMBERSHIP_MODAL,
  props: PlausibleMembershipModalProperties & PlausibleCustomProperties
): void;
function trackEvent(
  name: PlausibleEvent.MEMBERSHIP_MODAL_BACK,
  props: PlausibleMembershipModalBackNavSource & PlausibleCustomProperties
): void;
function trackEvent(
  name: PlausibleEvent.CONTINUE_WITH_PRICE,
  props: PlausibleContinueWithPriceProperties &
    PlausiblePricingSectionSourceProperties &
    PlausibleCustomProperties
): void;
function trackEvent(
  name: PlausibleEvent.VISIT_ABOUT_MEMBERSHIP,
  props: PlausibleVisitAboutMembershipProperties & PlausibleCustomProperties
): void;
function trackEvent(
  name: PlausibleEvent.VISIT_MEMBERSHIP_FAQ | PlausibleEvent.VISIT_RULES,
  props: PlausiblePricingSectionSourceProperties & PlausibleCustomProperties
): void;
function trackEvent(
  // Exclude all events that were handled above
  name: Exclude<
    PlausibleEvent,
    | PlausibleEvent.SET_GARDEN_VISIBILITY
    | PlausibleEvent.SEND_RESPONSE
    | PlausibleEvent.EMAIL_RESUBSCRIBE
    | PlausibleEvent.EMAIL_UNSUBSCRIBE
    | PlausibleEvent.CONTINUE_WITH_PRICE
    // Causes type issues in Footer, TopNav & SideDrawer :/
    // | PlausibleEvent.VISIT_ABOUT_MEMBERSHIP
    // | PlausibleEvent.VISIT_FAQ
    // | PlausibleEvent.VISIT_RULES
    // Causes type issues in ZoomRestrictionNotice
    // | PlausibleEvent.OPEN_MEMBERSHIP_MODAL
  >,
  props?: PlausibleCustomProperties,
  trailing?: boolean
): void;
function trackEvent(
  eventName: PlausibleEvent,
  customProperties: PlausibleCustomProperties = {},
  trailing = false
) {
  // Error boundary for this non-critical action
  try {
    if (
      eventName === PlausibleEvent.EMAIL_UNSUBSCRIBE ||
      eventName === PlausibleEvent.EMAIL_RESUBSCRIBE
    ) {
      // Don't debounce these events, because we want to know if two different list subscriptions were
      // changed in quick succession
      return logToPlausible(eventName, customProperties);
    } else {
      // Debounce all other events
      if (!debouncedLoggers[eventName]) {
        debouncedLoggers[eventName] = debounce(logToPlausible, 5 * 1000, {
          // By default, immediately send the event, and ignore following events
          leading: !trailing,
          trailing
        });
      }
      // We can be certain that the debounced logger exists due to section above.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return debouncedLoggers[eventName]!(eventName, customProperties);
    }
  } catch (e) {
    console.error('Error while logging to plausible:', e);
  }
}

/**
 * Log custom properties on all page views
// https://plausible.io/docs/custom-props/for-pageviews
 * @param plausibleScriptElement
 */
export const registerCustomPropertyTracker = (
  plausibleScriptElement: Element | null | undefined
) => {
  return user.subscribe(($user) => {
    if (!plausibleScriptElement) {
      return;
    }
    if ($user) {
      plausibleScriptElement.setAttribute('event-logged_in', 'true');
      if ($user.superfan) {
        plausibleScriptElement.setAttribute('event-superfan', 'true');
      } else {
        plausibleScriptElement.setAttribute('event-superfan', 'false');
      }
    } else {
      plausibleScriptElement.setAttribute('event-logged_in', 'false');
      plausibleScriptElement.setAttribute('event-superfan', 'false');
    }
  });
};

export default trackEvent;
