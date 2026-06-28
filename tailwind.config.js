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
        // ★ Brand · Indigo (primary) — paleta nueva 2026
        brand: {
          50:  '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
          300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1',
          600: '#4F46E5', // primary action
          700: '#4338CA', 800: '#3730A3', 900: '#312E81',
        },
        violet: { 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED' },
        cyan:   { 400: '#22D3EE', 500: '#06B6D4', 700: '#0E7490' },
        // Legacy aliases (mapeados a Indigo para back-compat — no romper .jsx existentes)
        sapphire: {
          400: '#818CF8',
          500: '#4F46E5',
          600: '#4338CA',
          700: '#3730A3',
        },
        obsidian: {
          900: '#050507',
          800: '#0B0B10',
          700: '#12121A',
          600: '#1A1A24',
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
        'glow-sapphire': '0 0 24px rgba(79, 70, 229, 0.35)',
        'glow-indigo': '0 0 24px rgba(79, 70, 229, 0.45)',
        'glow-violet': '0 0 24px rgba(139, 92, 246, 0.45)',
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
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(79, 70, 229, 0)' },
          '50%': { boxShadow: '0 0 24px 8px rgba(79, 70, 229, 0.25)' },
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