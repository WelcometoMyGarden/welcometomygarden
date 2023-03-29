import { getUser } from '$lib/stores/auth';
import type {
  PlausibleEvent,
  PlausibleCustomProperties,
  PlausibleGardenVisibilityProperties,
  PlausibleResponseRoleProperties
} from '$lib/types/Plausible';
import { debounce } from 'lodash-es';

type Callable = (eventName: PlausibleEvent, customProperties?: PlausibleCustomProperties) => void;

const debouncedLoggers: { [key in PlausibleEvent]?: Callable } = {};

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
  name: Exclude<
    PlausibleEvent,
    PlausibleEvent.SET_GARDEN_VISIBILITY | PlausibleEvent.SEND_RESPONSE
  >,
  props?: PlausibleCustomProperties,
  trailing?: boolean
): void;
function trackEvent(
  eventName: PlausibleEvent,
  customProperties: PlausibleCustomProperties = {},
  trailing = false
) {
  if (!debouncedLoggers[eventName]) {
    debouncedLoggers[eventName] = debounce(
      (innerEventName: PlausibleEvent, innerCustomProperties?: PlausibleCustomProperties) => {
        const { superfan } = getUser();
        window.plausible(innerEventName, {
          props: { superfan: superfan || false, ...innerCustomProperties }
        });
      },
      5 * 1000,
      {
        // By default, immediately send the event, and ignore following events
        leading: !trailing,
        trailing
      }
    );
  }

  // The line above sets the events
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return debouncedLoggers[eventName]!(eventName, customProperties);
}

export default trackEvent;
