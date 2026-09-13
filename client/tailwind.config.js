/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Overrides the default Tailwind sans-serif stack
        sans: ['"Plus Jakarta Sans"', 'sans-serif'], 
      },
    },
  },
  plugins: [],
}