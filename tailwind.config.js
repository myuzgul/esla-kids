/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FDF7F8',
          100: '#FBECEF',
          200: '#F7D6DC',
          300: '#F0B6C1',
          400: '#E88D9C',
          500: '#D66D80',
          600: '#BF4E63',
          700: '#A13A4D',
          800: '#853241',
          900: '#6E2C37',
        },
        powder: {
          50: '#F4F8FA',
          100: '#E6F0F4',
          200: '#CBE0E9',
          300: '#A4C8D8',
          400: '#7BA4B5',
          500: '#5A8A9E',
        },
        cream: {
          50: '#FDFBF7',
          100: '#FAF7F2',
          200: '#F3EDE2',
          300: '#E8DFD0',
          400: '#D5C7B2',
        },
        charcoal: {
          50: '#F4F5F7',
          100: '#E4E6EB',
          200: '#C8CBD4',
          400: '#7E8299',
          600: '#4B4F63',
          800: '#2D3142',
          900: '#1A1C29',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
