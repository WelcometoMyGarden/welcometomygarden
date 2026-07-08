import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import svelteConfig from './svelte.config.js';

// Flat config for the SvelteKit frontend.
// NOTE: the `api/` subfolder is a separate project with its own eslint.config.js
// and its own (consistently applied) rules — it is ignored here.
export default tseslint.config(
  {
    ignores: [
      'build/',
      'dist/',
      '.svelte-kit/',
      'package/',
      'public/',
      'coverage/',
      'api/',
      'android/',
      'ios/',
      'tools/',
      'src/browser-support.min.js'
    ]
  },

  // Base recommended rule sets.
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,

  // Turn off all rules that conflict with Prettier (formatting is Prettier's job).
  prettier,
  ...svelte.configs.prettier,

  // Environment globals available across the frontend.
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },

  // Let the Svelte parser hand <script lang="ts"> blocks to the TS parser,
  // and give it the project's svelte.config.js for accurate parsing.
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.svelte'],
        svelteConfig
      }
    }
  },

  // Project-wide preferences (non-formatting). These encode long-standing
  // team conventions; formatting concerns stay in Prettier.
  {
    rules: {
      'no-console': 'warn',
      'no-unused-expressions': ['error', { allowTernary: true }],
      'no-return-assign': ['error', 'except-parens'],
      'no-param-reassign': ['error', { props: false }]
    }
  }
);
