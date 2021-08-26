/* eslint-env node */
import path from 'path';
import fs from 'fs';

/**
 * Generate a virtual module to later dynamically import locale files.
 * @see https://github.com/rollup/rollup/issues/2463#issuecomment-455957865
 * @docs https://rollupjs.org/guide/en/#plugin-development
 */
export default (localesDir = '../../src/locales', virtualModuleId = 'app-available-locales') => ({
  name: 'app-available-locales-plugin',
  resolveId: (id) => (id === virtualModuleId ? id : null),
  load: (id) => {
    if (id === virtualModuleId) {
      const targetDir = path.join(__dirname, localesDir);
      const availableLocales = fs.readdirSync(targetDir).filter((f) => f.endsWith('.json'));
      const localeCodes = availableLocales.map((file) => file.split('.')[0]);
      return `export default ${JSON.stringify(localeCodes)}`;
    }
    return null;
  }
});
