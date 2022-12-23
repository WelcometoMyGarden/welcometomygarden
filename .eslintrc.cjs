// This file must be .cjs because our project is an ESM project (type: "module")
// https://eslint.org/docs/latest/user-guide/configuring/configuration-files#configuration-file-formats
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['svelte3', '@typescript-eslint'],
  ignorePatterns: ['*.cjs'],
  overrides: [{ files: ['*.svelte'], processor: 'svelte3/svelte3' }],
  settings: {
    'svelte3/typescript': () => require('typescript'),
    'svelte3/ignore-warnings':
      () =>
      ({ code }) =>
        // The referrer problem is [real](https://developer.mozilla.org/en-US/docs/Web/Security/Referer_header:_privacy_and_security_concerns#the_referrer_problem),
        // but now that we enforce the 'strict-origin-when-cross-origin' referrer policy via our root template,
        // the security risks are less substantial. We even _want_ the referrer to be there, to know when
        // when visitors find slowby.travel from welcomtomygarden.org, for example.
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy#integration_with_html
        // We can still disable the referrer on a per-case basis, when we don't trust the link target at all.
        //
        // Where we learned how to add this config:
        // https://github.com/sveltejs/language-tools/issues/855
        // https://github.com/sveltejs/eslint-plugin-svelte3/issues/193#issuecomment-1353121774
        code === 'security-anchor-rel-noreferrer'
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
