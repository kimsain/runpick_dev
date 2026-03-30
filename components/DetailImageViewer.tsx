'use client'

import { useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'

interface Props {
  src: string
  alt: string
  priority?: boolean
}

export default function DetailImageViewer({ src, alt, priority }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const [zoomed, setZoomed] = useState(false)
  const reduced = useReducedMotion()

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setOrigin(`${x}% ${y}%`)
    setZoomed(true)
  }, [])

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-card border border-border"
      initial={reduced ? undefined : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {!loaded && (
        <div className="absolute inset-0 bg-elevated/50 animate-pulse rounded-2xl" />
      )}
      <div
        className="cursor-zoom-in overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setZoomed(false)}
      >
        <Image
          src={src}
          alt={alt}
          width={600}
          height={600}
          priority={priority}
          className="w-full object-contain transition-transform duration-300"
          style={{
            transform: zoomed && !reduced ? 'scale(1.6)' : 'scale(1)',
            transformOrigin: origin,
          }}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </motion.div>
  )
}
