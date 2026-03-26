'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'

interface Props {
  target: number
  duration?: number
}

export default function AnimatedCounter({ target, duration = 1.2 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const reduced = useReducedMotion()
  const [value, setValue] = useState(reduced ? target : 0)

  useEffect(() => {
    if (!isInView || reduced) { setValue(target); return }
    let rafId = 0
    const startTime = performance.now()
    function tick(now: number) {
      const elapsed = Math.min((now - startTime) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - elapsed, 3)
      setValue(Math.round(eased * target))
      if (elapsed < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isInView, target, duration, reduced])

  return <span ref={ref} aria-live="off">{value}</span>
}
