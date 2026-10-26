import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  if (mode === 'cli') {
    return {
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        ssr: resolve(__dirname, 'src/cli.ts'),
        rollupOptions: {
          output: {
            entryFileNames: 'cli.js',
            format: 'esm',
          },
        },
      },
    };
  }

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            'three-globe': ['three', 'd3-geo', 'topojson-client', 'world-atlas/countries-110m.json'],
            'react-vendor': ['react', 'react-dom', 'lucide-react'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
    },
  };
});
