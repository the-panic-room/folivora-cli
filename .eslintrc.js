module.exports = {
  env: {
    browser: false,
    node: true,
    commonjs: true,
    es6: true,
    jasmine: true
  },
  extends: [
    'standard'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    "indent": ["error", 4],
  }
}
