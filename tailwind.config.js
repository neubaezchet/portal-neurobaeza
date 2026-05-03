/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', '"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        obsidian: {
          900: '#050507',
          800: '#0B0B10',
          700: '#12121A',
          600: '#1A1A24',
        },
        sapphire: {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        champagne: {
          400: '#FDE68A',
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      borderRadius: {
        '2026': '20px',
        '2026-lg': '28px',
        '2026-xl': '36px',
        '2026-pill': '9999px',
      },
      boxShadow: {
        'glass-sm': '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-md': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glow-sapphire': '0 0 24px rgba(14, 165, 233, 0.35)',
      },
      backdropBlur: {
        '2026': '30px',
      },
      animation: {
        'fade-up-2026': 'fadeUp2026 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-sapphire': 'pulseSapphire 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-morph': 'borderMorph 6s ease infinite',
        'shimmer-2026': 'shimmer2026 2.5s linear infinite',
      },
      keyframes: {
        fadeUp2026: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSapphire: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(14, 165, 233, 0)' },
          '50%': { boxShadow: '0 0 24px 8px rgba(14, 165, 233, 0.25)' },
        },
        borderMorph: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer2026: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
      },
    },
  },
  plugins: [],
}