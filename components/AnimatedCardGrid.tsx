'use client'

import { Children } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { fadeUpVariants, staggerContainer } from '@/lib/motion'

interface Props {
  children: React.ReactNode
  className?: string
}

export default function AnimatedCardGrid({ children, className }: Props) {
  const reduced = useReducedMotion()

  return (
    <motion.div
      className={className}
      variants={staggerContainer()}
      initial={reduced ? undefined : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {Children.map(children, (child) => (
        <motion.div variants={fadeUpVariants}>{child}</motion.div>
      ))}
    </motion.div>
  )
}
