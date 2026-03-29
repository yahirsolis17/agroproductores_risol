import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: true,
    pool: 'threads',
    restoreMocks: true,
    clearMocks: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      '@reduxjs/toolkit',
      'react-redux',
      'axios',
      'formik',
      'yup',
      'react-toastify',
      'clsx',
    ],
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (
            id.includes('react-dom')
            || id.includes('react-router-dom')
            || id.includes('react/')
          ) {
            return 'react-vendor';
          }

          if (id.includes('@mui') || id.includes('@emotion')) {
            return 'mui-vendor';
          }

          if (
            id.includes('@reduxjs/toolkit')
            || id.includes('react-redux')
            || id.includes('/redux/')
            || id.includes('/axios/')
          ) {
            return 'data-vendor';
          }

          if (id.includes('/formik/') || id.includes('/yup/')) {
            return 'forms-vendor';
          }

          if (id.includes('/lucide-react/')) return 'icons-vendor';
          if (id.includes('/framer-motion/')) return 'animation-vendor';
          if (id.includes('/recharts/')) return 'charts-vendor';

          if (
            id.includes('/react-icons/')
            || id.includes('/react-toastify/')
          ) {
            return 'visual-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
})
