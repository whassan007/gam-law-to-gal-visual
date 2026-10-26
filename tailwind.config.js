/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050814',
          900: '#0a0f24',
          800: '#111936',
          700: '#1a254d',
        },
        // Deontic editor tokens; values live on .law-editor in styles/index.css
        ed: {
          bg: 'var(--color-bg-primary)',
          surface: 'var(--color-bg-secondary)',
          sunken: 'var(--color-bg-sunken)',
          border: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
          text: 'var(--color-text-primary)',
          muted: 'var(--color-text-secondary)',
          subtle: 'var(--color-text-tertiary)',
          accent: 'var(--color-accent)',
          'accent-soft': 'var(--color-accent-soft)',
          'on-accent': 'var(--color-on-accent)',
          error: 'var(--color-error)',
          'error-soft': 'var(--color-error-soft)',
          warning: 'var(--color-warning)',
          'warning-soft': 'var(--color-warning-soft)',
          success: 'var(--color-success)',
          'success-soft': 'var(--color-success-soft)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
};
