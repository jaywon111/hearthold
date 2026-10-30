/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f6f5f4",
        ink: "#000000",
        hairline: "#e6e6e6",
        blue: { DEFAULT: "#0075de", active: "#005bab" },
        indigo: "#213183",
        flag: "#dd5b00",
        "flag-deep": "#793400",
      },
      fontFamily: {
        display: ['"Fraunces Variable"', "Georgia", "serif"],
        body: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "rgba(0,0,0,0.01) 0 0.175px 1.041px, rgba(0,0,0,0.02) 0 0.8px 2.925px, rgba(0,0,0,0.027) 0 2.025px 7.847px",
        tray: "rgba(0,0,0,0.05) 0 23px 52px, rgba(0,0,0,0.12) 0 8px 24px",
      },
    },
  },
  plugins: [],
};
