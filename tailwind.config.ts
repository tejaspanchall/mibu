import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "sans-serif"
        ]
      },
      colors: {
        ink: "#0a0a0a",
        paper: "#ffffff",
        muted: "#8a8a8e",
        line: "#ececee",
        chip: "#f2f2f4",
        positive: "#16a34a",
        negative: "#dc2626"
      },
      boxShadow: {
        frame: "0 30px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)"
      }
    }
  },
  plugins: []
};

export default config;
