import { getUser } from '$lib/stores/auth';
import {
  PlausibleEvent,
  type PlausibleCustomProperties,
  type PlausibleGardenVisibilityProperties,
  type PlausibleResponseRoleProperties,
  type PlausibleSubscriptionProperties
} from '$lib/types/Plausible';
import { debounce } from 'lodash-es';

type Callable = (eventName: PlausibleEvent, customProperties?: PlausibleCustomProperties) => void;

const debouncedLoggers: { [key in PlausibleEvent]?: Callable } = {};

const logToPlausible = (
  eventName: PlausibleEvent,
  customProperties?: PlausibleCustomProperties
) => {
  const { superfan } = getUser();
  window.plausible(eventName, {
    props: { superfan: superfan || false, ...customProperties }
  });
};

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
  // Exclude all events that were handled above
  name: Exclude<
    PlausibleEvent,
    | PlausibleEvent.SET_GARDEN_VISIBILITY
    | PlausibleEvent.SEND_RESPONSE
    | PlausibleEvent.EMAIL_RESUBSCRIBE
    | PlausibleEvent.EMAIL_UNSUBSCRIBE
  >,
  props?: PlausibleCustomProperties,
  trailing?: boolean
): void;
function trackEvent(
  eventName: PlausibleEvent,
  customProperties: PlausibleCustomProperties = {},
  trailing = false
) {
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
}

export default trackEvent;
