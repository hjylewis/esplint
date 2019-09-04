module.exports = {
  env: {
    es6: true,
    "jest/globals": true,
    node: true
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 2017
  },
  plugins: ["jest"],
  rules: {
    "no-console": "warn",
    "no-shadow": "error"
  }
};
