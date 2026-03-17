import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#080808",
        surface: "#111111",
        elevated: "#1c1c1c",
        card: "#161616",
        accent: "#c8ff00",
        "accent-dim": "#a8d600",
        primary: "#f2f2f2",
        secondary: "#8c8c8c",
        muted: "#8b8b8b",
        border: "#222222",
        "border-hover": "#333333",
        "spec-cushion": "#38bdf8",
        "spec-response": "#a3e635",
        "spec-stability": "#fbbf24",
        "spec-durability": "#f87171",
        "spec-weight": "#a78bfa",
        "spec-value": "#fb923c",
        "conf-very-high": "#38bdf8",
        "conf-high":      "#4ade80",
        "conf-medium":    "#facc15",
        "conf-low":       "#f87171",
      },
      fontFamily: {
        display: ["Bebas Neue", "sans-serif"],
        body: ["Outfit", "sans-serif"],
      },
      fontSize: {
        xs: ["0.71rem", { lineHeight: "1.4" }],
        sm: ["1rem", { lineHeight: "1.6" }],
        md: ["1.4rem", { lineHeight: "1.3" }],
        lg: ["1.96rem", { lineHeight: "1.2" }],
        xl: ["2.74rem", { lineHeight: "1.1" }],
        "2xl": ["3.84rem", { lineHeight: "1.05" }],
        hero: ["6rem", { lineHeight: "1.0" }],
      },
      aspectRatio: {
        "3/4": "3 / 4",
      },
      boxShadow: {
        "glow-sm": "0 0 12px rgba(200,255,0,0.08)",
        glow: "0 0 20px rgba(200,255,0,0.12)",
        card: "0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)",
        elevated: "0 8px 32px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
