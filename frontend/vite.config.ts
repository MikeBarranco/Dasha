import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // MapLibre es grande por naturaleza y ya se carga en su propio chunk diferido.
    chunkSizeWarningLimit: 1200,
  },
});
