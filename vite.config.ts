import { defineConfig } from 'vite';

// GitHub Pages serves at /<repo>/; Capacitor (native) serves from root.
// VITE_BASE is set by the Pages workflow; locally and in `cap sync` it's '/'.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  server: { host: true, port: 5173 },
  build: { target: 'es2022', outDir: 'dist', assetsInlineLimit: 4096 },
});
