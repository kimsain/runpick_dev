'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from 'framer-motion'

interface Props {
  totalCount: number
}

const EASE_OUT_QUART = [0.25, 0.46, 0.45, 0.94] as const

const HERO_SHOES = [
  { src: '/images/shoes/alphafly-3.webp', alt: 'Nike Alphafly 3' },
  { src: '/images/shoes/adizero-adios-pro-4.webp', alt: 'Adidas Adizero Adios Pro 4' },
  { src: '/images/shoes/fast-r-nitro-elite-3.webp', alt: 'Puma FAST-R Nitro Elite 3' },
  { src: '/images/shoes/metaspeed-ray.webp', alt: 'Asics Metaspeed Ray' },
  { src: '/images/shoes/endorphin-elite-2.webp', alt: 'Saucony Endorphin Elite 2' },
  { src: '/images/shoes/hyperwarp-pure.webp', alt: 'Mizuno HyperWarp Pure' },
  { src: '/images/shoes/cielo-x1-3-0.png', alt: 'Hoka Cielo X1 3.0' },
  { src: '/images/shoes/hyperion-elite-5.png', alt: 'Brooks Hyperion Elite 5' },
  { src: '/images/shoes/fuelcell-sc-elite-v5.webp', alt: 'New Balance FuelCell SC Elite v5' },
] as const

const STATS = (totalCount: number) => [
  { value: '9', label: '개 브랜드' },
  { value: String(totalCount), label: '개 신발' },
  { value: '실측', label: '데이터 기반' },
]

export default function AnimatedHeroContent({ totalCount }: Props) {
  const prefersReduced = useReducedMotion()
  const [isDesktop, setIsDesktop] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (prefersReduced) return
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SHOES.length)
    }, 4000)
    return () => clearInterval(id)
  }, [prefersReduced])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const { scrollY } = useScroll()
  const shoeY = useTransform(scrollY, [0, 600], [0, -60])
  const textY = useTransform(scrollY, [0, 600], [0, 30])

  const transition = (delay: number) => ({
    duration: prefersReduced ? 0 : 0.6,
    ease: EASE_OUT_QUART,
    delay: prefersReduced ? 0 : delay,
  })

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: prefersReduced ? 0 : 24 },
    animate: { opacity: 1, y: 0 },
    transition: transition(delay),
  })

  const fadeLeft = (delay: number) => ({
    initial: { opacity: 0, x: prefersReduced ? 0 : -20 },
    animate: { opacity: 1, x: 0 },
    transition: transition(delay),
  })

  const floatingAnimation = prefersReduced
    ? {}
    : {
        animate: { y: [0, isDesktop ? -14 : -8, 0] },
        transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const },
      }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#080808]">
      {/* Desktop: left-right split / Mobile: stacked */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20 flex flex-col md:flex-row md:items-center md:gap-12">

        {/* ── Left: Text content ── */}
        <motion.div
          className="flex-1 md:order-1 order-2 mt-8 md:mt-0"
          style={isDesktop ? { y: textY } : undefined}
        >
          {/* Label */}
          <motion.p
            {...fadeLeft(0)}
            className="text-secondary text-sm font-body tracking-widest uppercase mb-4 flex items-center gap-3"
          >
            러닝화 탐색 플랫폼
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={transition(0.15)}
              style={{ originX: 0 }}
              className="inline-block h-px w-12 bg-accent"
            />
          </motion.p>

          {/* Headline */}
          <h1 className="font-display leading-none mb-6">
            <motion.span
              {...fadeUp(0.25)}
              className="block text-[clamp(3rem,10vw,7rem)] text-accent"
            >
              FIND YOUR
            </motion.span>
            <motion.span
              {...fadeUp(0.35)}
              className="block text-[clamp(3rem,10vw,7rem)] text-accent"
            >
              RUN
            </motion.span>
          </h1>

          {/* Stat chips */}
          <motion.div
            {...fadeUp(0.5)}
            className="flex flex-wrap gap-3 mb-8"
          >
            {STATS(totalCount).map((stat) => (
              <div
                key={stat.label}
                className="border border-elevated px-3 py-1.5 text-sm font-body"
              >
                <span className="text-accent font-display">{stat.value}</span>
                <span className="text-secondary ml-1">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={transition(0.6)}
          >
            <motion.div
              whileHover={prefersReduced ? {} : { scale: 1.04 }}
              whileTap={prefersReduced ? {} : { scale: 0.97 }}
              className="inline-block"
            >
              <Link
                href="/shoes"
                className="inline-flex items-center gap-3 bg-accent text-dark font-display text-xl px-6 py-4 min-h-[44px] transition-shadow hover:shadow-[0_0_24px_rgba(200,255,0,0.4)]"
              >
                신발 탐색 →
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ── Right: Shoe image ── */}
        <div
          className="flex-1 md:order-2 order-1 flex items-center justify-center relative"
          style={{ minHeight: 0 }}
        >
          <motion.div
            style={isDesktop ? { y: shoeY } : undefined}
            className="relative w-full"
          >
            <motion.div
              initial={{ opacity: 0, x: prefersReduced ? 0 : 40, scale: prefersReduced ? 1 : 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={transition(0.15)}
              className="relative"
            >
              <motion.div {...floatingAnimation}>
              {/* Chartreuse glow */}
              <div
                className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse, rgba(200,255,0,0.15) 0%, transparent 70%)',
                }}
              />

              {/* Shoe carousel */}
              <div className="relative aspect-[7/5] max-h-[45vh] md:max-h-none">
                {HERO_SHOES.map((shoe, index) => (
                  <motion.div
                    key={shoe.src}
                    className="absolute inset-0"
                    animate={{ opacity: index === activeIndex ? 1 : 0 }}
                    transition={{ duration: 0.6, ease: EASE_OUT_QUART }}
                    aria-hidden={index !== activeIndex}
                  >
                    <Image
                      src={shoe.src}
                      alt={shoe.alt}
                      width={700}
                      height={500}
                      priority={index === 0}
                      sizes="(min-width: 768px) 50vw, 100vw"
                      className="w-full h-full object-contain drop-shadow-2xl"
                    />
                  </motion.div>
                ))}
              </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
