module.exports = {
  env: {
    node: true,
  },
  extends: 'rainbow',
  globals: {
    task: 'readonly',
  },
  overrides: [
    {
      env: {
        mocha: true,
      },
      files: ['test/**/*.js'],
      globals: {
        rainbowRouterInstance: 'writable',
        upgrades: 'readonly',
      },
    },
  ],
  rules: {
    'import/no-commonjs': 'off',
  },
  settings: {
    react: {
      version: '999.999.999',
    },
  },
};
