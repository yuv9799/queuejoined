import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    // Local dev: forward /api to the Express server (npm run dev:api).
    proxy: { '/api': 'http://localhost:8080' },
  },
});
