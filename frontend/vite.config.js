import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@sentry')) return 'sentry-vendor';
          if (id.includes('react-router')) return 'router-vendor';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('i18next')) return 'i18n-vendor';
          if (id.includes('@stripe')) return 'stripe-vendor';
          return 'vendor';
        },
      },
    },
  },
});