import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  
  server: {
    port: 5173,
    host: 'localhost', // Use 'localhost' explicitly for Web Speech API compatibility
  },

  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    minify: 'esbuild',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  preview: {
    port: 4173,
    host: true,
  },
}))
 