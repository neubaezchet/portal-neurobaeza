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
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#030305',
          900: '#050507',
          800: '#08080D',
          700: '#0E0E16',
          600: '#14142A',
          500: '#1A1A36',
        },
        indigo: {
          350: '#A5B4FC',
          450: '#818CF8',
        },
        sapphire: {
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
        },
        violet: {
          350: '#C4B5FD',
          450: '#A78BFA',
        },
        champagne: {
          400: '#FDE68A',
          500: '#FBBF24',
          600: '#F59E0B',
        },
        enterprise: {
          surface: 'rgba(14, 14, 22, 0.55)',
          border: 'rgba(255, 255, 255, 0.06)',
          hover: 'rgba(129, 140, 248, 0.06)',
        },
      },
      borderRadius: {
        '2026': '16px',
        '2026-lg': '24px',
        '2026-xl': '32px',
        '2026-pill': '9999px',
      },
      boxShadow: {
        'glass-xs': '0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glass-sm': '0 8px 32px -8px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glass-md': '0 16px 48px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glass-lg': '0 24px 80px -16px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glow-indigo': '0 0 32px -4px rgba(99, 102, 241, 0.3)',
        'glow-indigo-lg': '0 0 48px -4px rgba(99, 102, 241, 0.4)',
        'glow-violet': '0 0 32px -4px rgba(167, 139, 250, 0.3)',
        'inner-glow': 'inset 0 0 32px rgba(129, 140, 248, 0.06)',
      },
      backdropBlur: {
        '2026': '48px',
        '2026-sm': '32px',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-glow': 'pulseGlow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-breathe': 'borderBreathe 4s ease infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'gradient-x': 'gradientX 4s ease infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(32px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(99, 102, 241, 0)' },
          '50%': { boxShadow: '0 0 32px 8px rgba(99, 102, 241, 0.15)' },
        },
        borderBreathe: {
          '0%, 100%': { borderColor: 'rgba(129, 140, 248, 0.1)' },
          '50%': { borderColor: 'rgba(129, 140, 248, 0.25)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}