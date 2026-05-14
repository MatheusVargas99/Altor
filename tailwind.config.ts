import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0F172A', 2: '#1E293B', 3: '#334155' },
        primary: { DEFAULT: '#C9A961', 2: '#A98F4E' },
        text: { DEFAULT: '#F1F5F9', dim: '#94A3B8' },
        border: { DEFAULT: '#334155' },
        success: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        gold: '#FFD700',
      },
    },
  },
  plugins: [],
};

export default config;
