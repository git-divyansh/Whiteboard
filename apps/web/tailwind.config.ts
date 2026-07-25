import sharedPreset from '@whiteboard/config/tailwind';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [sharedPreset],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
};

export default config;
