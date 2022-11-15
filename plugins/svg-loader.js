import pkg from 'svg-inline-loader';
const { getExtractedSVG } = pkg;
import fs from 'fs';

//TODO: remove this once https://github.com/vitejs/vite/pull/2909 gets merged
export const customSvgLoader = (options) => {
  return {
    name: 'vite-svg-patch-plugin',
    transform: function (code, id) {
      if (id.endsWith('.svg')) {
        const extractedSvg = fs.readFileSync(id, 'utf8');
        return `export default '${getExtractedSVG(extractedSvg, options)}'`;
      }
      return code;
    }
  };
};
