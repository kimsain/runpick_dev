import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#080808",
        surface: "#111111",
        elevated: "#1c1c1c",
        card: "#161616",
        accent: "#c8ff00",
        primary: "#f2f2f2",
        secondary: "#8c8c8c",
        muted: "#4a4a4a",
        "spec-cushion": "#38bdf8",
        "spec-response": "#c8ff00",
        "spec-stability": "#fbbf24",
        "spec-durability": "#f87171",
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
    },
  },
  plugins: [],
};
export default config;
