/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#273172",
        secondary: "#49B3F4",
        brand: {
          navy: "#273172",
          blue: "#49B3F4",
          peach: "#FFBC7D",
          green: "#23A455",
          soft: "#F3F8FE",
        },
      },
      fontFamily: {
        sans: ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fira Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        script: ['"Dancing Script"', 'cursive'],
      },
      boxShadow: {
        soft: '0 20px 60px -25px rgba(39, 49, 114, 0.35)',
      },
    },
  },
  plugins: [],
}
