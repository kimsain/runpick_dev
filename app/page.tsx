import Link from 'next/link'
import Image from 'next/image'
import HeroSection from '@/components/HeroSection'
import ShoeCard from '@/components/ShoeCard'
import { getAllShoes, getBrands } from '@/lib/data'
import type { Shoe, Specs } from '@/lib/types'

const PURPOSE_CARDS = [
  {
    title: '데일리',
    desc: '매일 달려도 발을 든든하게 받쳐주는 트레이너',
    href: '/shoes?category=daily',
    color: '#C8FF00',
    imageSlug: 'novablast-5',
  },
  {
    title: '슈퍼트레이너',
    desc: '템포·인터벌 훈련 한계를 끌어올리는 플레이티드 트레이너',
    href: '/shoes?category=super-trainer',
    color: '#FBBF24',
    imageSlug: 'superblast-2',
  },
  {
    title: '레이싱',
    desc: '카본 플레이트로 목표 기록을 단축하는 레이서',
    href: '/shoes?category=racing',
    color: '#F87171',
    imageSlug: 'alphafly-3',
  },
]

const CONFIDENCE_ORDER: Record<string, number> = { 'very-high': 3, high: 2, medium: 1, low: 0 }

function pickTop(
  shoes: Shoe[],
  sortKey: keyof Specs,
  filter: (s: Shoe) => boolean
): Shoe[] {
  return shoes
    .filter(filter)
    .sort((a, b) => {
      const bVal = Number(b.specs[sortKey] ?? 0)
      const aVal = Number(a.specs[sortKey] ?? 0)
      const diff = bVal - aVal
      if (diff !== 0) return diff
      const cDiff =
        (CONFIDENCE_ORDER[b.confidence ?? 'low'] ?? 0) -
        (CONFIDENCE_ORDER[a.confidence ?? 'low'] ?? 0)
      if (cDiff !== 0) return cDiff
      const vDiff = (b.specs.valueScore ?? 0) - (a.specs.valueScore ?? 0)
      if (vDiff !== 0) return vDiff
      return a.slug.localeCompare(b.slug)
    })
    .slice(0, 4)
}

export default function HomePage() {
  const allShoes = getAllShoes()
  const brands = getBrands()

  const highConfidence = (s: Shoe) =>
    s.confidence === 'very-high' || s.confidence === 'high'

  const newShoes = allShoes
    .filter((s) => s.releaseYear >= 2025)
    .sort((a, b) => {
      if (b.releaseYear !== a.releaseYear) return b.releaseYear - a.releaseYear
      return (
        (CONFIDENCE_ORDER[b.confidence ?? 'low'] ?? 0) -
        (CONFIDENCE_ORDER[a.confidence ?? 'low'] ?? 0)
      )
    })
    .slice(0, 4)

  const valueBest = pickTop(allShoes, 'valueScore', highConfidence)
  const responsivenessBest = pickTop(allShoes, 'responsiveness', highConfidence)
  const cushioningBest = pickTop(allShoes, 'cushioning', highConfidence)

  const sections = [
    { title: '신규 러닝화', shoes: newShoes },
    { title: '최고의 가성비', shoes: valueBest },
    { title: '최고의 에너지리턴', shoes: responsivenessBest },
    { title: '최고의 쿠션성', shoes: cushioningBest },
  ]

  return (
    <main>
      <HeroSection />

      {/* Purpose Cards */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="font-display text-lg text-primary mb-8 tracking-widest uppercase">
          목적별 탐색
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {PURPOSE_CARDS.map((card) => {
            const shoe = allShoes.find((s) => s.slug === card.imageSlug)
            const imagePath = shoe ? `/images${shoe.imageUrl}` : ''

            return (
              <Link
                key={card.title}
                href={card.href}
                className="group relative h-72 overflow-hidden bg-card border border-elevated hover:border-accent/40 transition-colors"
              >
                {imagePath && (
                  <Image
                    src={imagePath}
                    alt={card.title}
                    fill
                    sizes="224px"
                    className="object-contain p-4 opacity-40 group-hover:opacity-60 transition-opacity"
                  />
                )}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: `linear-gradient(to bottom, transparent, ${card.color})`,
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p
                    className="font-display text-md leading-tight mb-1"
                    style={{ color: card.color }}
                  >
                    {card.title}
                  </p>
                  <p className="text-secondary text-xs font-body">{card.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Brand Bar */}
      <section className="border-y border-elevated py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-6 justify-center">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/shoes?brands=${brand.id}`}
              className="font-display text-md text-muted hover:text-accent transition-colors tracking-widest"
            >
              {brand.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Curation Sections */}
      {sections.map((section, sectionIdx) => (
        <section key={section.title} className="py-16 px-6 max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-display text-lg text-primary tracking-widest uppercase">
              {section.title}
            </h2>
            <Link
              href="/shoes"
              className="text-xs font-body text-secondary hover:text-accent transition-colors"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {section.shoes.map((shoe, i) => (
              <ShoeCard
                key={shoe.slug}
                shoe={shoe}
                priority={sectionIdx === 0 && i < 2}
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
