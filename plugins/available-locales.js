/* eslint-env node */
import { join, dirname } from 'path';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';

const fileName = fileURLToPath(import.meta.url);
const dirName = dirname(fileName);

/**
 * Generate a virtual module to later dynamically import locale files.
 * @see https://github.com/rollup/rollup/issues/2463#issuecomment-455957865
 * @docs https://rollupjs.org/guide/en/#plugin-development
 */
export const createAvailableLocales = (
  localesDir = '../../src/locales',
  virtualModuleId = 'app-available-locales'
) => ({
  name: 'app-available-locales-plugin',
  resolveId: (id) => (id === virtualModuleId ? id : null),
  load: (id) => {
    if (id === virtualModuleId) {
      const targetDir = join(dirName, localesDir);
      const availableLocales = readdirSync(targetDir).filter((f) => f.endsWith('.json'));
      const localeCodes = availableLocales.map((file) => file.split('.')[0]);
      return `export default ${JSON.stringify(localeCodes)}`;
    }
    return null;
  }
});
