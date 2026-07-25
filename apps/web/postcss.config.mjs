/**
 * PostCSS pipeline for the web app. Without this file Next.js never runs the
 * Tailwind plugin, so `@tailwind` directives in globals.css are shipped
 * unprocessed and no utility classes are generated (the page renders as
 * unstyled HTML). Tailwind v3 uses the `tailwindcss` + `autoprefixer` plugins.
 *
 * DO NOT bulk-delete `*.mjs` files in this directory — this config lives here.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
