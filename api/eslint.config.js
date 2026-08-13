const prettierRecommended = require('eslint-plugin-prettier/recommended');
const globals = require('globals');

module.exports = [
  prettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node
      },
      sourceType: 'commonjs'
    },
    rules: {
      'prettier/prettier': ['error'],
      'comma-dangle': ['error', 'never'],
      'no-underscore-dangle': 0,
      'no-console': 'warn',

      'no-unused-expressions': [
        'error',
        {
          allowTernary: true
        }
      ],
      'no-unused-vars': [
        'error',
        {
          // Sometimes it is needed to catch an error of client code to throw
          // a more specific error to consumers. In this case, JS expects an
          // error variable that may not be used.
          caughtErrors: 'none'
        }
      ],
      'no-return-assign': [2, 'except-parens'],
      'no-param-reassign': [
        'error',
        {
          props: false
        }
      ],
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'ForInStatement',
          message:
            'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.'
        },
        {
          selector: 'ForOfStatement',
          message:
            'iterators/generators require regenerator-runtime, which is too heavyweight for this guide to allow them. Separately, loops should be avoided in favor of array iterations.'
        },
        {
          selector: 'LabeledStatement',
          message:
            'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.'
        },
        {
          selector: 'WithStatement',
          message:
            '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.'
        }
      ],
      // Not sure how else to cleanly serialize promise execution...
      'no-await-in-loop': 'warn',
      camelcase: 'off'
    }
  },
  // ESM scripts (e.g. scripts/typecheck.mjs) — the base block above sets
  // `sourceType: 'commonjs'`, which would fail to parse `import`/`export`.
  {
    files: ['**/*.mjs'],
    languageOptions: {
      sourceType: 'module'
    }
  },
  // Test, seeder and script files legitimately log to the console (test output,
  // seed progress, tooling). Product code under src/ keeps `no-console: warn`.
  {
    files: ['test/**', 'seeders/**', 'scripts/**'],
    rules: {
      'no-console': 'off'
    }
  }
];
