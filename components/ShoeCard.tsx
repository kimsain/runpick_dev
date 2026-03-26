import Image from 'next/image'
import Link from 'next/link'
import type { Shoe } from '@/lib/types'
import { CONF_TEXT, CONF_DOT, CONF_BADGE_LABELS, CONF_TOOLTIPS } from '@/lib/confidence'
import { SPEC_LABELS } from '@/lib/constants'
import AnimatedSpecBar from '@/components/AnimatedSpecBar'

interface Props {
  shoe: Shoe
  priority?: boolean
}

const SPEC_BARS: { key: keyof typeof specColors; label: string }[] = [
  { key: 'cushioning',     label: SPEC_LABELS.cushioning },
  { key: 'responsiveness', label: SPEC_LABELS.responsiveness },
  { key: 'stability',      label: SPEC_LABELS.stability },
  { key: 'durability',     label: SPEC_LABELS.durability },
  { key: 'weightScore',    label: SPEC_LABELS.weightScore },
  { key: 'valueScore',     label: SPEC_LABELS.valueScore },
]

const specColors = {
  cushioning: 'bg-spec-cushion',
  responsiveness: 'bg-spec-response',
  stability: 'bg-spec-stability',
  durability: 'bg-spec-durability',
  weightScore: 'bg-spec-weight',
  valueScore: 'bg-spec-value',
}

export default function ShoeCard({ shoe, priority = false }: Props) {
  const imagePath = shoe.imageUrl.startsWith('/shoes/')
    ? `/images${shoe.imageUrl}`
    : shoe.imageUrl

  return (
    <Link
      href={`/shoes/${shoe.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/20 hover:shadow-card-hover"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-elevated/70 md:aspect-[3/4]">
        {shoe.confidence && (() => {
          const conf = shoe.confidence
          const colorClass = CONF_TEXT[conf] ?? 'text-secondary'
          const dotClass = CONF_DOT[conf] ?? 'bg-secondary'
          const label = CONF_BADGE_LABELS[conf] ?? conf.toUpperCase()
          const tooltipText = CONF_TOOLTIPS[conf] ?? ''
          return (
            <div className="absolute right-3 top-3 z-10">
              <div className="group/badge relative">
                <div
                  className={`glass flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-body ${colorClass}`}
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
                  {label}
                </div>
                <span className="invisible absolute right-0 top-full z-20 mt-1 w-max max-w-[200px] rounded-lg bg-elevated px-3 py-2 text-xs text-secondary shadow-elevated group-hover/badge:visible">
                  {tooltipText}
                </span>
              </div>
            </div>
          )
        })()}
        <Image
          src={imagePath}
          alt={shoe.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          className="object-contain p-5 transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
        {/* Hover overlay — desktop only */}
        <div className="absolute inset-0 hidden translate-y-full flex-col items-start justify-end rounded-t-xl bg-dark/85 p-5 transition-transform duration-300 md:flex md:backdrop-blur-sm group-hover:translate-y-0 group-focus-within:translate-y-0">
          <p className="mb-3 text-sm font-body leading-relaxed text-primary">
            {shoe.shortDescription}
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-display uppercase tracking-widest text-accent">
            자세히 보기
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

      {/* Mobile: always-visible short description */}
      <div className="px-5 pt-3 md:hidden">
        <p className="line-clamp-2 text-xs font-body leading-relaxed text-secondary">
          {shoe.shortDescription}
        </p>
      </div>

      {/* Info */}
      <div className="p-5">
        <p className="mb-1 text-xs font-display uppercase tracking-widest text-muted">
          {shoe.brandId.toUpperCase()}
        </p>
        <p className="line-clamp-2 text-base font-body font-semibold text-primary">
          {shoe.name}
        </p>
        <p className="mt-1 text-lg font-body font-bold text-accent">
          {shoe.priceFormatted}
        </p>

        {/* Spec bars */}
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
          {SPEC_BARS.map(({ key, label }, idx) => {
            const val = (shoe.specs[key as keyof typeof shoe.specs] as number) ?? 0
            return (
              <AnimatedSpecBar
                key={key}
                label={label}
                value={val}
                colorClass={specColors[key]}
                delay={idx * 0.05}
              />
            )
          })}
        </div>
      </div>
    </Link>
  )
}
