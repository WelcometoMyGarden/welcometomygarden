module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['svelte3', '@typescript-eslint'],
  ignorePatterns: ['*.cjs'],
  overrides: [{ files: ['*.svelte'], processor: 'svelte3/svelte3' }],
  settings: {
    'svelte3/typescript': () => require('typescript')
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020
  },
  env: {
    browser: true,
    es2017: true,
    node: true
  },
  rules: {
    'comma-dangle': ['error', 'never'],
    'no-console': 'warn',
    'no-unused-expressions': ['error', { allowTernary: true }],
    'no-return-assign': [2, 'except-parens'],
    'no-param-reassign': ['error', { props: false }]
  }
};
