const config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Custom colors from the original project
      colors: {
        lime: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // QuickHire brand colors
        'quickhire': {
          green: '#45A735',
          'green-dark': '#26472B',
          'green-light': '#78EB54',
        }
      },
      fontFamily: {
        'open-sauce': ['Open Sauce One Regular', 'sans-serif'],
        'open-sauce-bold': ['Open Sauce One Bold', 'sans-serif'],
        'open-sauce-medium': ['Open Sauce One Medium', 'sans-serif'],
        'open-sauce-semibold': ['Open Sauce One SemiBold', 'sans-serif'],
        'open-sauce-extrabold': ['Open Sauce One ExtraBold', 'sans-serif'],
      },
      // Custom spacing and sizing from original design
      spacing: {
        '18': '4.5rem',
        '70': '17.5rem',
        '78': '19.5rem',
        '90': '22.5rem',
      },
      // Custom animations
      animation: {
        'float': 'floatUpDown 3s ease-in-out infinite',
      },
      keyframes: {
        floatUpDown: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
  // Note: We'll handle MUI conflicts in globals.css instead of disabling preflight
};

export default config;
