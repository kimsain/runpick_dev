'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { fadeUpVariants, REDUCED_MOTION_TRANSITION } from '@/lib/motion'

interface Props {
  children: React.ReactNode
  className?: string
}

export default function ScrollRevealSection({ children, className }: Props) {
  const reduced = useReducedMotion()

  return (
    <motion.section
      className={className}
      variants={fadeUpVariants}
      initial={reduced ? undefined : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      transition={reduced ? REDUCED_MOTION_TRANSITION : undefined}
    >
      {children}
    </motion.section>
  )
}
