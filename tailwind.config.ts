import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        masters: {
          hero: '#081a0e',
          green: '#0a5c36',
          'green-dark': '#063d24',
          'green-mid': '#0f7048',
          gold: '#d4af37',
          'gold-light': '#f0d978',
          'gold-muted': '#b8962e',
          cream: '#faf8f0',
          surface: '#f4f7f5',
        },
      },
      fontFamily: {
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        sans: ['"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out',
        'shimmer': 'shimmer 1.5s linear infinite',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 20px rgba(0,0,0,0.12)',
        'gold': '0 0 0 3px rgba(212,175,55,0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
