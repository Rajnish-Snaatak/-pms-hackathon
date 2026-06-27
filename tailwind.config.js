/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#4285f4',
          50: '#e8f0fe',
          600: '#1a73e8',
          700: '#1557b0',
        },
        success: '#34a853',
        warning: '#f29900',
        danger: '#d93025',
        purple: {
          DEFAULT: '#7b2fff',
        },
        orange: {
          DEFAULT: '#e8710a',
        },
        surface: '#f8f9fa',
        ink: {
          DEFAULT: '#202124',
          muted: '#5f6368',
          faint: '#80868b',
        },
        // team colors
        coe: '#7b2fff',
        aws: '#188038',
        central: '#1a73e8',
        olly: '#e8710a',
      },
      borderColor: {
        DEFAULT: '#e8eaed',
        line: '#e8eaed',
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(60,64,67,0.08)',
        pop: '0 4px 16px rgba(60,64,67,0.16)',
      },
    },
  },
  plugins: [],
}
