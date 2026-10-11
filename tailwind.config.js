/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Central design tokens
        medical: {
          primary: '#075A9F',
          'primary-dark': '#064D88',
          secondary: '#1599C5',
          'secondary-light': '#E6F3F9',
          green: '#00C878',
          'green-dark': '#00A866',
          greenlight: '#E5F9F1',
          emergency: '#FF1717',
          'emergency-dark': '#E50914',
          emergencysoft: '#FFF0F0',
        },
        surface: '#F5F9FC',
        ink: '#102A43',
        'ink-muted': '#6B8198',
        line: '#E1EAF2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,42,67,0.06)',
        cardhover: '0 6px 18px rgba(16,42,67,0.09)',
      },
    },
  },
  plugins: [],
};