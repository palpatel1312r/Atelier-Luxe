import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const tenantOrigin = env.VITE_BACKEND_ORIGIN || 'http://abctraders.localhost:8000';
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      proxy: {
        '/api': {
          target: tenantOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
