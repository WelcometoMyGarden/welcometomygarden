export default (name, cookies) => {
  if (cookies == null) {
    if (typeof window === 'undefined') {
      return undefined;
    }
    cookies = document.cookie;
  }

  const kv = cookies.split(';').find((part) => part.trim().startsWith(name));

  if (!kv) return undefined;

  const cookieValue = kv.split('=')[1];
  if (!cookieValue) return undefined;

  return decodeURIComponent(cookieValue.trim());
};
