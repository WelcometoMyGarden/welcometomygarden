import { get } from 'svelte/store';
import type { LocalizedMessage } from './translation-helpers';
import validateEmail from './validate-email';
import { countryNames } from '$lib/stores/countryNames';

/**
 * Validates a value.
 * @returns undefined if no validation errors occurred.
 *          If an error occurred, returns a localized error message.
 */
export type Validator = (value: string | undefined) => LocalizedMessage | undefined;

export const { email, password, firstName, lastName, country, consent, reference } = {
  firstName: (v) => {
    if (!v || v.trim() === '') return { key: 'register.validate.first-name.set' };
    if (v.length > 25) return { key: 'register.validate.first-name.max' };
  },
  lastName: (v) => {
    if (!v || v.trim() === '') return { key: 'register.validate.last-name.set' };
    if (v.length > 50) return { key: 'register.validate.last-name.max' };
  },
  email: (v) => {
    if (!v || (typeof v === 'string' && v.trim() === '')) {
      return { key: 'register.validate.email' };
    }
    if (!validateEmail(v)) {
      return { key: 'register.notify.invalid' };
    }
  },
  password: (v) => {
    if (!v) return { key: 'register.validate.password.set' };
    if (v.length < 8) return { key: 'register.validate.password.min' };
    // Primarily to prevent password length denial of service
    if (v.length > 100) return { key: 'register.validate.password.max' };
  },
  country: (v?: string) => {
    if (!v || !get(countryNames)[v]) {
      return { key: 'register.validate.country.from-list' };
    }
  },
  consent: (v) => {
    if (!v) return { key: 'register.validate.consent' };
  },
  reference: (v: any) => {
    if (typeof v === 'string' && v.length > 3000) {
      return { key: 'register.validate.reference' };
    }
    if (typeof v !== 'string' && v != null) {
      // Shouldn't happen
      return { key: 'register.validate.reference' };
    }
  }
} satisfies {
  [key: string]: Validator;
};
