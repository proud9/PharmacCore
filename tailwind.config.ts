import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12211f",
        pine: {
          950: "#071614",
          900: "#0b2a26",
          800: "#0f3d37",
          700: "#16554c",
          600: "#1c6b60",
        },
        sage: {
          100: "#e8f0ea",
          300: "#b7cfc0",
          500: "#6f9a86",
        },
        parchment: "#f4efe6",
        brass: "#c4a35a",
        rust: "#b85c38",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 18px 50px -24px rgba(7, 22, 20, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
