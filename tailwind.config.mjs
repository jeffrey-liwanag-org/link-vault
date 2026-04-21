/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FDFCF8',
        sage: '#E8EFE8',
        lavender: '#EFEDF4',
        coral: '#FFB7B2',
        warm: {
          950: '#292524',
          500: '#78716C',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        cursive: ['"Reenie Beanie"', 'cursive'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'float-alt': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(10px)' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-alt': 'float-alt 8s ease-in-out infinite',
        reveal: 'reveal 0.8s ease-out forwards',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0,0,0,0.05)',
        card: '0 8px 32px -4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
