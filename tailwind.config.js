/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  content: ["./views/**/*.ejs"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [
    {
      tailwindcss: {},
      autoprefixer: {},
    },
  ],
};
