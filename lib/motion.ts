import type { Variants, Transition } from 'framer-motion'

export const EASE_OUT_QUART = [0.25, 0.46, 0.45, 0.94] as const

export const REDUCED_MOTION_TRANSITION: Transition = { duration: 0 }

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT_QUART } },
}

export const staggerContainer = (staggerDelay = 0.08): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: staggerDelay } },
})
