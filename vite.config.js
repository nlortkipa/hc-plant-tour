import { defineConfig } from 'vite';

// Relative base so the built bundle runs from any folder (e.g. inside a future SCORM zip).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
  },
});
