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
      'src/**/*.min.js',
      // svelte-eslint-parser cannot tokenize the inline third-party <script src>
      // nested inside <svelte:head> here (valid Svelte, but breaks the JS parser).
      'src/routes/**/account/+page.svelte'
    ]
  },

  // Base recommended rule sets.
  js.configs.recommended,
  tseslint.configs.recommended,
  svelte.configs.recommended,

  // Turn off all rules that conflict with Prettier (formatting is Prettier's job).
  prettier,
  ...svelte.configs.prettier,

  // Environment globals available across the frontend.
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Injected at build time via Vite `define` (see vite.config.ts).
        __COMMIT_HASH__: 'readonly',
        __COMMIT_MESSAGE__: 'readonly',
        __BUILD_DATE__: 'readonly',
        // Loaded as a global by the Mapbox GL script.
        mapboxgl: 'readonly'
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
    },
    rules: {
      // TypeScript + svelte-check already flag genuine undefined references, and
      // `no-undef` produces false positives on TS type references in markup
      // (e.g. the DOM `AutoFill` type). Disable it for Svelte files, matching
      // typescript-eslint's own guidance for TS-typed files.
      'no-undef': 'off'
    }
  },

  // Project-wide preferences and deliberate relaxations.
  // Rationale for each relaxation is documented in LINT_DECISIONS.md.
  {
    rules: {
      // --- Team conventions (kept, mirroring api/eslint.config.js) ---
      'no-console': 'warn',
      'no-return-assign': ['error', 'except-parens'],
      'no-param-reassign': ['error', { props: false }],
      // Superseded by the typescript-eslint version below for TS/Svelte files.
      'no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true }
      ],
      // Allow intentionally-unused identifiers when prefixed with `_`, and
      // unused caught errors (a re-throw/wrap pattern), like the api/ project.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          ignoreRestSiblings: true
        }
      ],

      // --- Deliberate relaxations  ---
      // `DEV:` labels wrap dev-only code and are stripped in production builds
      // via esbuild `dropLabels: ['DEV']` (vite.config.ts) — not dead labels.
      'no-unused-labels': 'off',
      // `any` is used pragmatically throughout; to be improved over time
      '@typescript-eslint/no-explicit-any': 'off',
      // The codebase needs to render trusted i18n/markdown HTML via {@html} extensively.
      'svelte/no-at-html-tags': 'off',
      // SvelteKit's resolve()-for-navigation is a newer best practice not yet
      // adopted across the app; enabling it is a migration, not a bug fix.
      'svelte/no-navigation-without-resolve': 'off',
      // Keys on {#each} are optional in Svelte; the app relies on index keying.
      'svelte/require-each-key': 'off',
      // New Svelte 5 nudges that would change state-modeling semantics.
      // T
      'svelte/prefer-svelte-reactivity': 'off',
      'svelte/prefer-writable-derived': 'off',
      // `{' '}` is used deliberately to preserve significant whitespace between
      // inline elements that Prettier splits across lines; the rule flags it as
      // "useless".
      'svelte/no-useless-mustaches': 'off',
      // False positives: these svelte-ignore comments suppress Svelte *compiler*
      // (svelte-check) a11y warnings, which eslint-plugin-svelte cannot see.
      'svelte/no-unused-svelte-ignore': 'off',
      // `@ts-ignore` is used as a pragmatic escape hatch in a few spots.
      '@typescript-eslint/ban-ts-comment': 'off',
      // New in eslint:recommended as of ESLint 10. It false-positives on Svelte 5
      // `$bindable()` prop defaults (e.g. `let { x = $bindable() } = $props()`),
      // which it reads as an assignment that is never used, and otherwise only
      // flags harmless initialize-then-overwrite patterns. Off, matching the
      // other Svelte-5-idiom relaxations above.
      'no-useless-assignment': 'off'
    }
  }
);
