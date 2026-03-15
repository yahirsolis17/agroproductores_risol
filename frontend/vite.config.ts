import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

          if (
            id.includes('/recharts/')
            || id.includes('/framer-motion/')
            || id.includes('/lucide-react/')
            || id.includes('/react-icons/')
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
