import { defineConfig } from 'vite';

// Saída com nomes fixos (assets/app.js) para publicar a pasta dist em qualquer lugar,
// inclusive como página estática, sem servidor.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
        inlineDynamicImports: true,
      },
    },
  },
});
