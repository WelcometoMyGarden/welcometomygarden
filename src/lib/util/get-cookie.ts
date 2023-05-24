export default (name: string) => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const cookies = document.cookie;

  const kv = cookies.split(';').find((part) => part.trim().startsWith(name));

  if (!kv) return undefined;

  const cookieValue = kv.split('=')[1];
  if (!cookieValue) return undefined;

  return decodeURIComponent(cookieValue.trim());
};
