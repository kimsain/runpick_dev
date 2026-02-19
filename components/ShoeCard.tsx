import Image from 'next/image'
import Link from 'next/link'
import type { Shoe } from '@/lib/types'

interface Props {
  shoe: Shoe
  priority?: boolean
}

const SPEC_BARS: { key: keyof typeof specColors; label: string }[] = [
  { key: 'cushioning', label: '쿠션' },
  { key: 'responsiveness', label: '반응' },
  { key: 'stability', label: '안정' },
  { key: 'durability', label: '내구' },
]

const specColors = {
  cushioning: 'bg-spec-cushion',
  responsiveness: 'bg-spec-response',
  stability: 'bg-spec-stability',
  durability: 'bg-spec-durability',
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
        <Image
          src={imagePath}
          alt={shoe.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          priority={priority}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-base/80 flex flex-col items-start justify-end p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-primary text-sm leading-snug mb-2 font-body">
            {shoe.shortDescription}
          </p>
          <span className="text-accent text-xs font-display tracking-widest uppercase">
            자세히 →
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-secondary text-xs font-display tracking-widest uppercase mb-1">
          {shoe.brandId.toUpperCase()}
        </p>
        <p className="text-primary font-body font-bold text-base truncate">
          {shoe.name}
        </p>
        <p className="text-accent font-body font-bold text-base mt-0.5">
          {shoe.priceFormatted}
        </p>

        {/* Spec bars */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {SPEC_BARS.map(({ key, label }) => {
            const val = shoe.specs[key as keyof typeof shoe.specs] as number
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
                  <div
                    className={`h-full ${specColors[key]} rounded-full`}
                    style={{ width: `${(val / 10) * 100}%` }}
                  />
                </div>
                <span className="text-muted text-xs font-body w-6 shrink-0">
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
