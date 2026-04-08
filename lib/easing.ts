/**
 * Raw rAF easing helpers (numeric `t in [0,1]`).
 * For framer-motion, import `EASE_OUT_QUART` / `EASE_OUT_EXPO` from `lib/motion.ts` instead.
 * For CSS transitions, use the `ease-out-quart` / `ease-out-expo` Tailwind tokens.
 *
 * These exist for components that drive their own requestAnimationFrame loop
 * (e.g. AnimatedCounter) and need a consistent curve with the rest of the system.
 */

/** visually equivalent to lib/motion.ts EASE_OUT_QUART = [0.25, 0.46, 0.45, 0.94] */
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

/** visually equivalent to lib/motion.ts EASE_OUT_EXPO = [0.16, 1, 0.3, 1] */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}
