import Image from 'next/image'
import Link from 'next/link'
import type { Shoe } from '@/lib/types'
import { CONF_DOT } from '@/lib/confidence'

interface Props {
  shoe: Shoe
  priority?: boolean
}

const SPEC_BARS: { key: keyof typeof specColors; label: string }[] = [
  { key: 'cushioning', label: '쿠션성' },
  { key: 'responsiveness', label: '반응성' },
  { key: 'stability', label: '안정성' },
  { key: 'durability', label: '내구성' },
  { key: 'weightScore', label: '경량성' },
  { key: 'valueScore', label: '가성비' },
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
      <div className="relative aspect-[3/4] overflow-hidden bg-elevated">
        {shoe.confidence && (() => {
          const dotClass = CONF_DOT[shoe.confidence] ?? 'bg-secondary'
          const tooltipText = shoe.confidence === 'very-high' ? 'RunRepeat + RTINGS 실측 데이터 완비' :
            shoe.confidence === 'high' ? '실측 데이터 + 전문가 리뷰 확인' :
            shoe.confidence === 'medium' ? '전문가 리뷰 기반 (실측 없음)' : '데이터 수집 중'
          return (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 group/badge">
              <span className={`w-2 h-2 rounded-full block ${dotClass}`} />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-44 bg-base/95 backdrop-blur-sm border border-elevated px-3 py-2 text-xs text-secondary font-body leading-snug opacity-0 group-hover/badge:opacity-100 transition-opacity duration-150 pointer-events-none z-20">
                {tooltipText}
              </div>
            </div>
          )
        })()}
        <Image
          src={imagePath}
          alt={shoe.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-base/80 flex flex-col items-center justify-end p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-primary text-sm leading-snug mb-2 font-body">
            {shoe.shortDescription}
          </p>
          <span className="text-accent text-xs font-display tracking-widest uppercase">
            자세히 →
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 text-center">
        <p className="text-secondary text-xs font-display tracking-widest uppercase mb-1">
          {shoe.brandId.toUpperCase()}
        </p>
        <p className="text-primary font-body font-bold text-base truncate">
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
