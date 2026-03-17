import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1B2A4A",
        accent: "#3B82F6",
        base: "#FFFFFF",
        soft: "#F5F7FB",
        border: "#E6E9F0",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(27, 42, 74, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
