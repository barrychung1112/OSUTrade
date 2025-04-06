const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
          "pop-blob": {
          "0%": { transform: "scale(1)" },
          "33%": { transform: "scale(1.2)" },
          "66%": { transform: "scale(0.8)" },
          "100%": { transform: "scale(1)" },
        },
        colors: {
          filter: {
         "blur-20": "blur(20px)",
         "blur-25": "blur(25px)",
          },
        },
      animation: {
        "pop-blob": "pop-blob 5s infinite",
      }
    },
   },
  },
  plugins: [animate],
};
