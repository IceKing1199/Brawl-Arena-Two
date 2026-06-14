import { defineConfig } from 'vite';

export default defineConfig({
  base: '/brawl-arena-two/',
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});
