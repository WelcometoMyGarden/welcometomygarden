const prettier = require('eslint-plugin-prettier');
const globals = require('globals');
const babelParser = require('@babel/eslint-parser');
const js = require('@eslint/js');

const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

module.exports = [
  ...compat.extends('plugin:prettier/recommended'),
  {
    plugins: {
      prettier
    },

    languageOptions: {
      globals: {
        ...globals.node
      },

      parser: babelParser,
      ecmaVersion: 5,
      // sourceType: "commonjs",
      sourceType: 'script',
      parserOptions: {
        requireConfigFile: false
      }
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
      'no-await-in-loop': 'warn',
      camelcase: 'off'
    }
  }
];
