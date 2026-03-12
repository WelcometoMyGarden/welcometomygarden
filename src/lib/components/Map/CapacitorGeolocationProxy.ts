import logger from '$lib/util/logger';
import { Geolocation, type Position } from '@capacitor/geolocation';
import { random } from 'lodash-es';

/**
 * See https://capacitorjs.com/docs/apis/geolocation#errors
 */
type CapacitorError = {
  // Example: Location permission request was denied.
  errorMessage: string;
  // See reference
  code: string;
  // same as the errorMessage
  message: string;
};

export const isCapacitorError = (err: any): err is CapacitorError => {
  if (
    typeof err !== 'undefined' &&
    err != null &&
    typeof err.code === 'string' &&
    typeof err.message === 'string'
  ) {
    return true;
  }
  return false;
};

/**
 * We don't have access to a GeolocationPositionError constructor,
 * so we make our own concrete error.
 */
class WebGeolocationPositionError extends Error implements GeolocationPositionError {
  code: number;

  readonly PERMISSION_DENIED = 1;
  readonly POSITION_UNAVAILABLE = 2;
  readonly TIMEOUT = 3;

  constructor(m: string, code: number) {
    super(m);
    this.code = code;
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, WebGeolocationPositionError.prototype);
  }
}
let positionHandlers = new Map();

/**
 * Web positions expect toJSON() methods in the result, enriches the native position to this effect.
 */
const mapNativeWebPosition = (nativePosition: Position) => {
  const coords = {
    ...nativePosition.coords,
    altitudeAccuracy: nativePosition.coords.altitudeAccuracy ?? null
  };

  const position = {
    coords,
    timestamp: nativePosition.timestamp
  };
  return {
    ...position,
    coords: {
      ...coords,
      toJSON: () => ({ ...coords })
    },
    toJSON: () => ({ ...position })
  };
};

const mapNativeToWebError = (nativeError: CapacitorError): WebGeolocationPositionError => {
  // Possible errors: https://capacitorjs.com/docs/apis/geolocation#errors
  // Should be translated into: https://developer.mozilla.org/en-US/docs/Web/API/GeolocationPositionError
  const code = (() => {
    switch (nativeError.code) {
      case 'OS-PLUG-GLOC-0003':
      case 'OS-PLUG-GLOC-0007':
      case 'OS-PLUG-GLOC-0008':
      case 'OS-PLUG-GLOC-0009':
        return GeolocationPositionError.PERMISSION_DENIED;
      case 'OS-PLUG-GLOC-0010':
        return GeolocationPositionError.TIMEOUT;
      case 'OS-PLUG-GLOC-0011':
      default:
        return GeolocationPositionError.POSITION_UNAVAILABLE;
    }
  })();

  return new WebGeolocationPositionError(nativeError.message, code);
};

const handleError = (nativeError: unknown, handler: PositionErrorCallback | null | undefined) => {
  if (nativeError) {
    if (isCapacitorError(nativeError) && handler) {
      handler(mapNativeToWebError(nativeError));
      return;
    } else if (handler) {
      const genericError = new WebGeolocationPositionError(
        'Unknown error during geolocation',
        GeolocationPositionError.POSITION_UNAVAILABLE
      );
      handler(genericError);
      return;
    }
    logger.warn('Logging a geolocation error, but there is no handler and the error is unknown');
    return;
  }
};

/**
 * Implements navigator.geolocation using Capacitor Geolocation methods
 */
export default {
  getCurrentPosition: async (success, error, options) => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? false,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0
      });

      success(mapNativeWebPosition(position));
    } catch (nativeError) {
      handleError(nativeError, error);
    }
  },
  watchPosition: (success, error, options) => {
    const id = random(100000);
    Geolocation.watchPosition(
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0
      },
      (position, err) => {
        if (err) {
          handleError(err, error);
          return -1;
        }
        if (position) {
          success(mapNativeWebPosition(position));
        }
      }
    ).then((nativeCallbackId) => positionHandlers.set(id, nativeCallbackId));
    return id;
  },
  clearWatch: (id) => {
    if (positionHandlers.has(id)) {
      Geolocation.clearWatch({ id: positionHandlers.get(id) });
    } else {
      logger.warn(
        `Tried to clear geolocation handler ${id}, but it was not connected to an async native listener id.`
      );
    }
  }
} satisfies typeof navigator.geolocation;
