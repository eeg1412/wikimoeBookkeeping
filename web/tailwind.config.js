/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-light': 'rgb(var(--color-primary-light) / <alpha-value>)',
        'primary-dark': 'rgb(var(--color-primary-dark) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'surface-secondary':
          'rgb(var(--color-surface-secondary) / <alpha-value>)',
        'on-surface': 'rgb(var(--color-on-surface) / <alpha-value>)',
        'on-surface-secondary':
          'rgb(var(--color-on-surface-secondary) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)'
      }
    }
  },
  plugins: []
}
