import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'sans-serif'],
      },
      colors: {
        'app-bg': '#f5f4f0',
        'app-surface': '#ffffff',
        'app-border': '#e0ddd5',
        'app-border-dark': '#c8c4bc',
        'app-text': '#333333',
        'app-text-muted': '#6b6a66',
        'app-text-faint': '#a09e99',
        'app-green': '#2e7d46',
        'app-green-bg': '#e8f3ec',
        'app-amber': '#b07a1e',
        'app-amber-bg': '#fbf3e0',
        'app-red': '#c0392b',
        'app-red-bg': '#fdecea',
        'app-blue': '#3f6fb0',
      },
      borderRadius: {
        app: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
