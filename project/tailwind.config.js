/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EAF3FA',
          100: '#D4E6F5',
          200: '#A9CDE9',
          300: '#7AB2DC',
          400: '#3F86BF',
          500: '#1A6AA3',
          600: '#0B4A7D',
          700: '#083A63',
          800: '#072F50',
          900: '#05233D',
        },
        ink: '#14253A',
        muted: '#5F6F82',
        page: '#F5F7FA',
        border: '#E4E9F0',
        success: { 50: '#EDF7F1', 600: '#1E7A46', 700: '#166237' },
        warning: { 50: '#FDF5E6', 600: '#A86400', 700: '#8A5100' },
        danger: { 50: '#FDECEC', 600: '#B42318', 700: '#912018' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'modal-in': { from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'page-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 37, 58, 0.04)',
        pop: '0 16px 40px -12px rgba(20, 37, 58, 0.28)',
      },
    },
  },
  plugins: [],
};
