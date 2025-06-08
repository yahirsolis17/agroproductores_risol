// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      colors: {
        primary: {
          light: '#C2D4CA',
          DEFAULT: '#7E9B9A', // Base principal
          dark: '#2F4858',
        },
        secondary: {
          light: '#AAC5B4',
          DEFAULT: '#608688',
          dark: '#46636E',
        },
        neutral: {
          50: '#F9FAFB',
          100: '#7E9B9A',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      boxShadow: {
        soft: '0 4px 14px rgba(0, 0, 0, 0.05)',
        deep: '0 8px 30px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
