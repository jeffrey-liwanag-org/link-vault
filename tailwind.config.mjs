/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          deepest: '#090A0F',
          deep: '#0d1117',
          mid: '#1B2735',
          steel: '#38495a',
        },
        accent: '#7DD3FC',
      },
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        animStar: {
          from: { transform: 'translateY(0px)' },
          to: { transform: 'translateY(-2000px)' },
        },
      },
      animation: {
        'star-slow': 'animStar 50s linear infinite',
        'star-mid': 'animStar 100s linear infinite',
        'star-fast': 'animStar 150s linear infinite',
      },
    },
  },
  plugins: [],
};
