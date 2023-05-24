type CookieOptions = {
  expires?: Date | string;
  path?: string;
};

type CookieValue = string | boolean | number;

const setCookie = (name: string, value: CookieValue, options: CookieOptions = {}) => {
  if (options.expires instanceof Date) {
    options.expires = options.expires.toUTCString();
  }

  const updatedCookie = {
    [encodeURIComponent(name)]: encodeURIComponent(value),
    sameSite: 'strict',
    ...options
  };

  document.cookie = Object.entries(updatedCookie)
    .map((kv) => kv.join('='))
    .join(';');
};

export function setExpiringCookie(
  name: string,
  value: CookieValue,
  hours: number,
  options?: CookieOptions
) {
  const hourMs = 3600000; // 60 * 60 * 1000
  const date = new Date();
  // Round in case hours is a fractional number
  date.setTime(date.getTime() + Math.round(hours * hourMs));
  setCookie(name, value, { expires: date.toUTCString(), ...options });
}

export default setCookie;
