/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#25d366",
          600: "#16a34a",
          700: "#128c7e",
          800: "#166534",
          900: "#14532d",
        },
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-slow": "pulse 3s infinite",
      },
      backgroundImage: {
        "whatsapp-gradient": "linear-gradient(135deg, #25d366, #128c7e)",
      },
    },
  },
  plugins: [],
};
