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
  type PlausiblePricingSectionSourceProperties
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
    | PlausibleEvent.OPEN_MEMBERSHIP_MODAL
    | PlausibleEvent.CONTINUE_WITH_PRICE
    // Causes type issues in Footer, TopNav & SideDrawer :/
    // | PlausibleEvent.VISIT_ABOUT_MEMBERSHIP
    // | PlausibleEvent.VISIT_FAQ
    // | PlausibleEvent.VISIT_RULES
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

export default trackEvent;
