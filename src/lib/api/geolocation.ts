import { isCapacitorError } from '$lib/components/Map/CapacitorGeolocationProxy';
import { isNative } from '$lib/util/uaInfo';
import { Capacitor, type PermissionState } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import * as Sentry from '@sentry/sveltekit';

export const checkPermission = async (): Promise<
  'granted' | 'denied' | 'prompt' | 'not-available'
> => {
  // ==== native geolocation ====
  //
  if (isNative && Capacitor.getPlatform() === 'ios') {
    let status: PermissionState;
    try {
      status = (await Geolocation.checkPermissions()).coarseLocation;
    } catch (e) {
      if (isCapacitorError(e) && e.code === 'OS-PLUG-GLOC-0007') {
        // This happens on iOS when Location Services are globally disabled.
        // If they are enabled, but specific permissions are granted to WTMG (even: "Never")
        // then checkPermissions() succeeds (In the case of "Never" it will likely return "denied")
        Sentry.captureMessage(`${Capacitor.getPlatform()} location services are globally disabled`);
      }
      // In any case, consider it denied
      status = 'denied';
    }
    switch (status) {
      case 'prompt':
      // TODO: I'm not sure when this applies, and how to add the rational to the prompt when needed
      case 'prompt-with-rationale':
        return 'prompt';
      default:
        return status;
    }
  }

  // ==== web geolocation ====

  // We noticed a bug where the map broke on iOS 15.2 due to "query" not existing on the permissions
  // object; while it actually supports geolocation
  //
  // From:  https://github.com/mapbox/mapbox-gl-js/blob/d8827408c6f4c4ceecba517931c96dda8bb261a1/src/ui/control/geolocate_control.js#L175-L177
  // > navigator.permissions has incomplete browser support http://caniuse.com/#feat=permissions-api
  // > Test for the case where a browser disables Geolocation because of an insecure origin;
  // > in some environments like iOS16 WebView, permissions reject queries but still support geolocation
  const geolocationObjectExists = !!navigator.geolocation;
  // on iOS <= 16, I don't think we can know the state. But 'prompt' is safe to assume?
  // because actually attempting a geolocation may result in a prompt / error / location
  // The purpose of this `geolocationPermission` is to decide whether or not to add the
  // geolocation control, and whether or not to try to trigger it automatically (see further on).
  const assumedState = geolocationObjectExists ? 'prompt' : 'not-available';
  if ('geolocation' in navigator && navigator?.permissions?.query !== undefined) {
    // Query if possible
    return await navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => result.state)
      // fall back to assumed state
      .catch(() => assumedState);
  } else {
    // fall back to assumed state if queries are not possible
    return assumedState;
  }
};
