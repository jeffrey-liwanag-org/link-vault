/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#111318',
          700: '#1F2937',
          500: '#6B7280',
          400: '#9CA3AF',
          300: '#D1D5DB',
          200: '#E5E7EB',
          100: '#F3F4F6',
          50:  '#F8F9FA',
        },
        indigo: {
          600: '#4F6BED',
          500: '#6366F1',
          400: '#818CF8',
          50:  '#EEF2FF',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0,0,0,0.05)',
        card: '0 8px 32px -4px rgba(0,0,0,0.08)',
      },
    },
  },
  safelist: [
    'bg-ink-950',
    'border-ink-700',
  ],
  plugins: [],
};
