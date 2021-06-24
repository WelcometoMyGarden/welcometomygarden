/* eslint-env node */
import svelte from 'rollup-plugin-svelte-hot';
import Hmr from 'rollup-plugin-hot';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import svg from 'rollup-plugin-svg-import';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import copy from 'rollup-plugin-copy';
import rimraf from 'rimraf';

const production = !process.env.ROLLUP_WATCH;
const isNollup = !!process.env.NOLLUP;

const PUBLIC_DIR = 'public';
const DIST_DIR = 'dist';
const BUILD_DIR = 'dist/build';

const env = process.env.NODE_ENV || 'development';

const defaultConfig = require('./wtmg.config.example.json');
let wtmgConfig = null;
try {
  wtmgConfig = require(env === 'development' ? './wtmg.config.json' : `./wtmg.config.${env}.json`);
} catch (ex) {
  wtmgConfig = {};
  console.log(
    'No config file found, defaulting to environment variables and default configuration'
  );
}
/*
  Sets the environment & configuration variables
  Will use environment variables first, then config file values, then the default value
  Values that are null in the default config must be provided (they are required for the project to run)
*/
Object.keys(defaultConfig).forEach((key) => {
  // if env variable is set, replace
  if (key in process.env) {
    wtmgConfig[key] = process.env[key];
    return;
  }

  // if no env variable is set, but config value is set, all good
  if (key in wtmgConfig && wtmgConfig[key] != null) return;

  // use default config as last resort
  if (defaultConfig[key] != null) {
    wtmgConfig[key] = defaultConfig[key];
    return;
  }
  console.error(`No value found for required configuration key "${key}"`);
});

export default () => {
  rimraf.sync(DIST_DIR);
  return [
    {
      preserveEntrySignatures: false,
      input: 'src/main.js',
      output: {
        sourcemap: !production,
        format: 'esm',
        name: 'app',
        dir: BUILD_DIR
      },
      plugins: [
        copy({
          targets: [{ src: [`${PUBLIC_DIR}/*`], dest: DIST_DIR }],
          copyOnce: true,
          flatten: false
        }),
        alias({
          entries: [{ find: '@', replacement: `${__dirname}/src` }]
        }),
        svg({ stringify: true }),
        json(),
        svelte({
          // enable run-time checks when not in production
          dev: !production,
          // we'll extract any component CSS out into a separate file - better for performance
          css: (css) => {
            css.write(`${BUILD_DIR}/bundle.css`);
          },
          hot: isNollup
        }),
        resolve({
          browser: true,
          dedupe: ['svelte']
        }),
        commonjs(),

        !production && isNollup && Hmr({ inMemory: true, public: PUBLIC_DIR }), // refresh only updated code
        !isNollup && !production && serve(),
        !production && !isNollup && livereload(BUILD_DIR), // refresh entire window when code is updated

        // If we're building for production minify
        production && terser(),
        replace({
          NODE_ENV: JSON.stringify(process.env.NODE_ENV),
          WTMG_CONFIG: JSON.stringify(wtmgConfig)
        })
      ],
      watch: {
        clearScreen: false,
        buildDelay: 100
      }
    },
    {
      input: 'src/service-worker.js',
      output: {
        sourcemap: true,
        format: 'iife',
        name: 'workbox',
        file: `${DIST_DIR}/service-worker.js`
      },
      plugins: [
        resolve({ browser: true }),
        replace({
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
        }),
        production && terser()
      ]
    }
  ];
};

function serve() {
  let started = false;

  return {
    writeBundle() {
      if (!started) {
        started = true;

        require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true
        });
      }
    }
  };
}
