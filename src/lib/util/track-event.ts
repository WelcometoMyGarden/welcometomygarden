import { getUser } from '$lib/stores/auth';
import { debounce } from 'lodash-es';

type CustomProps = Omit<Parameters<Plausible>[1], 'superfan'>;

type Callable = (eventName: Parameters<Plausible>[0], customProperties?: CustomProps) => void;

const debouncedLoggers: { [key in PlausibleEvent]?: Callable } = {};

export default (
  eventName: Parameters<Plausible>[0],
  customProperties?: CustomProps,
  trailing = false
) => {
  if (!debouncedLoggers[eventName]) {
    debouncedLoggers[eventName] = debounce(
      (innerEventName: Parameters<Plausible>[0], innerCustomProperties?: CustomProps) => {
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
};
