/**
 * SVG-friendly token map for chart components (recharts, SVG <text>/<rect>).
 * Recharts and bare SVG cannot consume Tailwind classes — they need
 * literal hex/rgb strings. Centralize the dark-mode palette here so
 * future palette shifts have a single source.
 *
 * IMPORTANT: keep these in sync with `tailwind.config.ts` colors.
 */

export const chartTokens = {
  // surfaces
  bgCard:    '#161616',
  bgElevated:'#1c1c1c',
  border:    '#222222',
  borderMid: 'rgba(255,255,255,0.06)',  // matches shadow-ring
  // text tiers
  textPrimary:    '#f7f8f8',
  textSecondary:  '#b4b8c0',
  textTertiary:   '#8a8f98',
  textQuaternary: '#62666d',
  // accent
  accent:    '#c8ff00',
  accentDim: '#a8d600',
  // confidence
  confLow:   '#f87171',
  // chart-specific
  gridStroke: '#222222',
  gridWidth:  1,           // bumped from 0.5 to avoid sub-pixel rendering
} as const

/**
 * Body font stack for SVG text. SVG <text> does not inherit
 * font-family from CSS class — must be set explicitly.
 */
export const chartFontFamily =
  'var(--font-pretendard), Outfit, -apple-system, BlinkMacSystemFont, system-ui, sans-serif'

export const chartMonoFamily =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
