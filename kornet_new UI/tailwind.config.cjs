/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1440px' },
    },
    extend: {
      colors: {
        // shadcn/ui semantic tokens (driven by CSS variables in index.css)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Kornet brand palette (from the radar/signal mark)
        kornet: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdcff',
          300: '#8ec6ff',
          400: '#59a6ff',
          500: '#2e86de',
          600: '#1e6fd9',
          700: '#1a59b4',
          800: '#1b4a91',
          900: '#1c4076',
          950: '#132848',
        },
        // Stitch Liquid Freight System Design Tokens
        'surface-container-lowest': '#020e21',
        'surface-container-low': '#0e1c2f',
        'surface-container': '#132033',
        'surface-container-high': '#1d2a3e',
        'surface-container-highest': '#28354a',
        'surface-bright': '#2d3a4e',
        'on-surface': '#d6e3fe',
        'on-surface-variant': '#c3c6d7',
        'primary-container': '#2563eb',
        'on-primary-container': '#eeefff',
        'tertiary-custom': '#68dba9',
        'tertiary-container': '#007d57',
        'on-tertiary-container': '#bdffdc',
        'secondary-container': '#bb0112',
        'on-secondary-container': '#ffc8c1',
        // Logistics status semantic helpers
        status: {
          success: 'hsl(var(--success))',
          warning: 'hsl(var(--warning))',
          info: 'hsl(var(--info))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        headline: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        label: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        code: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px hsl(var(--primary) / 0.1), 0 8px 30px -6px hsl(var(--primary) / 0.35)',
        'card-hover': '0 10px 40px -12px rgba(2, 24, 61, 0.28)',
      },
      backgroundImage: {
        'kornet-radial':
          'radial-gradient(1200px 600px at 100% -10%, hsl(var(--primary) / 0.14), transparent 60%)',
        'grid-faint':
          'linear-gradient(to right, hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.5) 1px, transparent 1px)',
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'radar-sweep': {
          '0%': { transform: 'rotate(0deg)', opacity: '0.7' },
          '100%': { transform: 'rotate(360deg)', opacity: '0.7' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'radar-sweep': 'radar-sweep 4s linear infinite',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
    require('tailwindcss-animate'),
  ],
}
