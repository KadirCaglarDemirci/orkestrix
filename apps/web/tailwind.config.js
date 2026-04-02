/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          500: "#4F6EF7",
          600: "#3B56E0",
          700: "#2C42C4",
        },
      },
    },
  },
  plugins: [],
};
