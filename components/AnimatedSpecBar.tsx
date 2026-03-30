'use client'

import { motion, useReducedMotion } from 'framer-motion'

interface Props {
  label: string
  value: number
  colorClass: string
  delay: number
}

export default function AnimatedSpecBar({ label, value, colorClass, delay }: Props) {
  const reduced = useReducedMotion()
  const widthPct = `${Math.max(2, (value / 10) * 100)}%`

  return (
    <div
      className="flex items-center gap-2"
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={10}
    >
      <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: widthPct, transformOrigin: 'left' }}
          initial={reduced ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>
      <span className="text-muted text-xs font-body w-9 shrink-0 truncate">
        {label}
      </span>
    </div>
  )
}
