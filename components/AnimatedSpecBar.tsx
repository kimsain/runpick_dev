'use client'

import { useReducedMotion } from 'framer-motion'

interface Props {
  label: string
  value: number
  colorClass: string
  delay?: number
}

export default function AnimatedSpecBar({ label, value, colorClass, delay = 0 }: Props) {
  const prefersReduced = useReducedMotion()
  const widthPct = `${Math.max(2, (value / 10) * 100)}%`

  return (
    <div
      className="flex items-center gap-2.5"
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={10}
    >
      <div className="relative flex-1 h-1.5 rounded-full bg-dark/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${colorClass} shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] ${prefersReduced ? '' : 'animate-scale-x'}`}
          style={{
            width: widthPct,
            transformOrigin: 'left',
            animationDelay: prefersReduced ? undefined : `${delay}s`,
          }}
        />
      </div>
      <span className="font-mono text-eyebrow uppercase text-tertiary w-9 shrink-0 truncate">
        {label}
      </span>
    </div>
  )
}
