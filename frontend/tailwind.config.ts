import type { Config } from 'tailwindcss';

/**
 * Tangram + shell do CS-OPS / Portal do Suporte.
 * Duas famílias: DM Sans no corpo (Tangram) e Bricolage Grotesque nos títulos
 * de display.
 * Cores nunca são literais aqui: sempre var(--token) definido em src/index.css.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', '"Nunito Sans"', '"Open Sans"', 'Arial', 'sans-serif'],
        bricolage: ['"Bricolage Grotesque"', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        elegant: 'var(--shadow-elevation)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        button: 'var(--radius-button)',
        shell: 'var(--shell-radius)',
      },
      backgroundImage: {
        'gradient-rail': 'var(--gradient-rail)',
        'gradient-brand': 'var(--gradient-brand)',
      },
      spacing: {
        shell: 'var(--shell-size)',
      },
    },
  },
  plugins: [],
} satisfies Config;
