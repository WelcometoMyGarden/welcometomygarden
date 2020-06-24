export let config = {};

export const configure = async () => {
  const configModule = NODE_ENV && NODE_ENV === 'production' ? await import('./wtmg.config.prod') : await import('./wtmg.config');
  config = configModule.default;
};
