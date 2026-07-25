import { nextConfig } from '@whiteboard/config/eslint/next';

export default [
  ...nextConfig,
  {
    // App-specific relaxations can go here.
    files: ['**/*.config.{js,ts,mjs}'],
    rules: {
      'no-console': 'off',
    },
  },
];
