import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // MapLibre es grande por naturaleza y ya se carga en su propio chunk diferido.
    chunkSizeWarningLimit: 1200,
  },
  test: {
    // jsdom da localStorage/window para las funciones que los tocan (api.ts).
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Cada test importa lo que usa de 'vitest' de forma explícita (sin globals).
    globals: false,
  },
});
