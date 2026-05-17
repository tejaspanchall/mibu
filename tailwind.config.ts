import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace"
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
        frame: "0 30px 80px -20px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
        soft: "0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)",
        pop: "0 8px 24px -8px rgba(0,0,0,0.12), 0 2px 6px -2px rgba(0,0,0,0.06)",
        fab: "0 12px 30px -10px rgba(10,10,10,0.35), 0 4px 10px -2px rgba(10,10,10,0.18)",
        focus: "0 0 0 3px rgba(10,10,10,0.10)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
