export let config = {};

const environment = NODE_ENV || 'development';
export const configure = async () => {
  let configPath = `./wtmg.config.${environment}.js`;
  if (environment === 'development') configPath = './wtmg.config.js';
  console.log(configPath);
  const configModule = await import(configPath);
  console.log(configModule);
  config = configModule.default;
};
