export default (name, value, options = {}) => {
  if (options.expires instanceof Date) {
    options.expires = options.expires.toUTCString();
  }

  let updatedCookie = {
    [encodeURIComponent(name)]: encodeURIComponent(value),
    sameSite: 'strict',
    ...options
  };

  document.cookie = Object.entries(updatedCookie)
    .map((kv) => kv.join('='))
    .join(';');
};
