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
        // 4-tier text scale (linear/notion 패턴)
        primary: "#f7f8f8",      // off-white (was #f2f2f2)
        secondary: "#b4b8c0",    // 본문 보조
        tertiary: "#8a8f98",     // 메타/캡션 (기존 muted 자리)
        quaternary: "#62666d",   // 비활성/플레이스홀더
        muted: "#8a8f98",        // 호환 alias (기존 코드 보호)
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
        display: ["var(--font-bebas)", "Bebas Neue", "sans-serif"],
        body: [
          "var(--font-pretendard)",
          "Outfit",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        // 기존 스케일 유지 + eyebrow 추가
        eyebrow: ["0.6875rem", { lineHeight: "1.2", letterSpacing: "0.08em" }],
        xs: ["0.71rem", { lineHeight: "1.4" }],
        sm: ["1rem", { lineHeight: "1.6" }],
        md: ["1.4rem", { lineHeight: "1.3" }],
        lg: ["1.96rem", { lineHeight: "1.2" }],
        xl: ["2.74rem", { lineHeight: "1.1" }],
        "2xl": ["3.84rem", { lineHeight: "1.05" }],
        hero: ["6rem", { lineHeight: "1.0" }],
      },
      letterSpacing: {
        "tight-1": "-0.006em",
        "tight-2": "-0.012em",
        "tight-3": "-0.018em",
        "tight-4": "-0.022em",
      },
      aspectRatio: {
        "3/4": "3 / 4",
      },
      boxShadow: {
        // 기존 토큰 유지
        "glow-sm": "0 0 12px rgba(200,255,0,0.08)",
        glow: "0 0 20px rgba(200,255,0,0.12)",
        elevated: "0 8px 32px rgba(0,0,0,0.4)",
        // shadow-as-border ring (vercel/linear 패턴, dark 적응)
        ring: "0 0 0 1px rgba(255,255,255,0.06)",
        "ring-strong": "0 0 0 1px rgba(255,255,255,0.10)",
        // multi-layer 카드 (inner highlight + 고도)
        card: "0 0 0 1px rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.4), 0 8px 24px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        "card-hover": "0 0 0 1px rgba(200,255,0,0.18), 0 4px 16px rgba(0,0,0,0.5), 0 16px 40px -16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        // featured (액센트 틴트 섀도우)
        feature: "0 0 0 1px rgba(200,255,0,0.22), 0 8px 24px -8px rgba(200,255,0,0.18), 0 24px 48px -16px rgba(0,0,0,0.6)",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        250: "250ms",
        400: "400ms",
      },
      keyframes: {
        'scale-x': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'scale-x': 'scale-x 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
      },
    },
  },
  plugins: [],
};
export default config;
