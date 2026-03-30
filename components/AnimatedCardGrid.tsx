'use client'

import { Children } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { fadeUpVariants, staggerContainer } from '@/lib/motion'

interface Props {
  children: React.ReactNode
  className?: string
  disableStagger?: boolean
}

export default function AnimatedCardGrid({ children, className, disableStagger }: Props) {
  const reduced = useReducedMotion()
  const count = Children.count(children)
  const shouldStagger = !disableStagger && count <= 12

  return (
    <motion.div
      className={className}
      variants={shouldStagger ? staggerContainer() : fadeUpVariants}
      initial={reduced ? undefined : 'hidden'}
      whileInView="visible"
      viewport={{ once: true }}
    >
      {shouldStagger
        ? Children.map(children, (child) => (
            <motion.div variants={fadeUpVariants}>{child}</motion.div>
          ))
        : children}
    </motion.div>
  )
}
