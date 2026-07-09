import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mystic-forest-three/',
  build: {
    outDir: 'docs',
  },
  server: {
    allowedHosts: true,
  },
});
