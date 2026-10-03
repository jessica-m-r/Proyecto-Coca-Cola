import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        coke: {
          red: "#F40009",
          dark: "#1A1A1A",
          light: "#FFF5F5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
