import Image from 'next/image'
import Link from 'next/link'
import type { Shoe } from '@/lib/types'
import { CONF_TEXT, CONF_DOT, CONF_BADGE_LABELS, CONF_TOOLTIPS } from '@/lib/confidence'
import { SPEC_LABELS } from '@/lib/constants'

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
      className="group block bg-card border border-elevated hover:border-accent/30 transition-colors duration-300 overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] md:aspect-[3/4] overflow-hidden bg-elevated">
        {shoe.confidence && (() => {
          const conf = shoe.confidence
          const colorClass = CONF_TEXT[conf] ?? 'text-secondary'
          const dotClass = CONF_DOT[conf] ?? 'bg-secondary'
          const label = CONF_BADGE_LABELS[conf] ?? conf.toUpperCase()
          const tooltipText = CONF_TOOLTIPS[conf] ?? ''
          return (
            <div className="absolute top-2 right-2 z-10 group/badge">
              <div
                className={`flex items-center gap-1 bg-dark/80 backdrop-blur-sm px-2 py-1 text-xs font-body border border-elevated ${colorClass}`}
                title={tooltipText}
              >
                <span className={`w-2 h-2 rounded-full inline-block ${dotClass}`} />
                {label}
              </div>
            </div>
          )
        })()}
        <Image
          src={imagePath}
          alt={shoe.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
        {/* Hover overlay — desktop only */}
        <div className="absolute inset-0 bg-dark/80 flex-col items-start justify-end p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden md:flex">
          <p className="text-primary text-sm leading-snug mb-2 font-body">
            {shoe.shortDescription}
          </p>
          <span className="text-accent text-sm font-display tracking-widest uppercase">
            자세히 →
          </span>
        </div>
      </div>

      {/* Mobile: always-visible short description */}
      <div className="md:hidden px-4 pt-0">
        <p className="text-secondary text-xs font-body line-clamp-2 mt-2">
          {shoe.shortDescription}
        </p>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-secondary text-sm font-display tracking-widest uppercase mb-1">
          {shoe.brandId.toUpperCase()}
        </p>
        <p className="text-primary font-body font-bold text-base line-clamp-2">
          {shoe.name}
        </p>
        <p className="text-primary font-body font-bold text-lg mt-1">
          {shoe.priceFormatted}
        </p>

        {/* Spec bars */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {SPEC_BARS.map(({ key, label }) => {
            const val = (shoe.specs[key as keyof typeof shoe.specs] as number) ?? 0
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full ${specColors[key]} rounded-full`}
                    style={{ width: `${(val / 10) * 100}%` }}
                  />
                </div>
                <span className="text-muted text-xs font-body w-9 shrink-0">
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}
