import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api':     { target: 'https://ataliarluxe.netlify.app/', changeOrigin: true },
      '/storage': { target: 'https://ataliarluxe.netlify.app/', changeOrigin: true },
    },
  },
});