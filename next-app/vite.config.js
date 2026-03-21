import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'https://api.investmtg.com',
      '/auth': 'https://api.investmtg.com',
      '/justtcg': 'https://api.investmtg.com',
      '/topdeck': 'https://api.investmtg.com',
      '/chatbot': 'https://api.investmtg.com',
      '/echomtg': 'https://api.investmtg.com',
      '/mtgstocks': 'https://api.investmtg.com',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
