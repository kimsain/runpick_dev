import Link from 'next/link'
import HeroSection from '@/components/HeroSection'
import ShoeCard from '@/components/ShoeCard'
import { getAllShoes, getBrands } from '@/lib/data'
import type { Shoe, Specs } from '@/lib/types'

const CONFIDENCE_ORDER: Record<string, number> = { 'very-high': 3, high: 2, medium: 1, low: 0 }

function getRawScore(shoe: Shoe, sortKey: keyof Specs): number {
  if (sortKey === 'cushioning') {
    const raw = shoe.specs.rawCushioning
    return Number.isFinite(raw) ? raw! : shoe.specs.cushioning
  }
  if (sortKey === 'responsiveness') {
    const raw = shoe.specs.rawResponsiveness
    return Number.isFinite(raw) ? raw! : shoe.specs.responsiveness
  }
  return Number(shoe.specs[sortKey] ?? 0)
}

function pickTop(
  shoes: Shoe[],
  sortKey: keyof Specs,
  filter: (s: Shoe) => boolean
): Shoe[] {
  return shoes
    .filter(filter)
    .sort((a, b) => {
      const bVal = getRawScore(b, sortKey)
      const aVal = getRawScore(a, sortKey)
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

  const valueBest = pickTop(allShoes, 'valueScore', highConfidence)
  const responsivenessBest = pickTop(allShoes, 'responsiveness', highConfidence)
  const cushioningBest = pickTop(allShoes, 'cushioning', highConfidence)

  const sections = [
    { title: '최고의 가성비', subtitle: '쿠션성·반응성·안정성·내구성 합산 ÷ 출시가 기준', shoes: valueBest },
    { title: '최고의 에너지리턴', subtitle: '에너지리턴(ER%) 실측 측정값 기준', shoes: responsivenessBest },
    { title: '최고의 쿠션성', subtitle: '충격흡수(SA) 실측 측정값 기준', shoes: cushioningBest },
  ]

  return (
    <main>
      <HeroSection />

      {/* Brand Bar */}
      <section className="border-y border-elevated py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-6 justify-center">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/shoes?brands=${brand.id}`}
              className="font-display text-md text-muted hover:text-accent transition-colors tracking-widest px-2 py-2 min-h-[44px] flex items-center"
            >
              {brand.name}
            </Link>
          ))}
        </div>
      </section>

      {/* Curation Sections */}
      {sections.map((section, sectionIdx) => (
        <section key={section.title} className="py-16 px-6 max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2 className="font-display text-lg text-primary tracking-widest uppercase">
                {section.title}
              </h2>
              {section.subtitle && (
                <p className="text-muted text-xs font-body mt-1">{section.subtitle}</p>
              )}
            </div>
            <Link
              href="/shoes"
              className="text-sm font-body text-secondary hover:text-accent transition-colors min-h-[44px] flex items-center px-2"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
