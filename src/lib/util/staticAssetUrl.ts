/**
 * Gets a static asset URL from a Google Cloud Storage bucket (configured in env files)
 */
export default (path: string) => {
  if (!path.startsWith('/')) {
    throw new Error('The static asset path must start with a /');
  }
  return `${import.meta.env.VITE_STATIC_ASSETS_BUCKET}${path}`;
};
