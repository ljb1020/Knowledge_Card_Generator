import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        panel: '#FFFFFF',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        primary: '#2563EB',
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
