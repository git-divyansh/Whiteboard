// Flat ESLint config for the Next.js web app. Extends the shared base and adds
// browser globals. Next.js-specific plugin rules can be added here once the
// eslint-plugin-next flat-config integration is wired in the security session.
import globals from 'globals';

import { baseConfig } from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export const nextConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];

export default nextConfig;
