import Link from 'next/link'
import HeroSection from '@/components/HeroSection'
import ShoeCard from '@/components/ShoeCard'
import ScrollRevealSection from '@/components/ScrollRevealSection'
import AnimatedCardGrid from '@/components/AnimatedCardGrid'
import Eyebrow from '@/components/ui/Eyebrow'
import SectionHeading from '@/components/ui/SectionHeading'
import { getAllShoes, getBrands } from '@/lib/data'
import type { Shoe, Specs } from '@/lib/types'

const CONFIDENCE_ORDER: Record<string, number> = { 'very-high': 3, high: 2, medium: 1, low: 0 }

function getRawScore(shoe: Shoe, sortKey: keyof Specs): number {
  if (sortKey === 'cushioning') return shoe.specs.rawCushioning ?? shoe.specs.cushioning
  if (sortKey === 'responsiveness') return shoe.specs.rawResponsiveness ?? shoe.specs.responsiveness
  if (sortKey === 'stability') return shoe.specs.rawStability ?? shoe.specs.stability
  if (sortKey === 'durability') return shoe.specs.rawDurability ?? shoe.specs.durability
  if (sortKey === 'valueScore') return shoe.specs.rawValueScore ?? shoe.specs.valueScore ?? 0
  if (sortKey === 'weightScore') return shoe.specs.rawLightness ?? shoe.specs.weightScore ?? 0
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

  return (
    <main>
      <HeroSection />

      {/* Brand Bar */}
      <ScrollRevealSection className="border-y border-border bg-surface/40 px-6 py-8">
        <div className="text-center">
          <Eyebrow className="mb-4">브랜드</Eyebrow>
          <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-x-2 gap-y-1">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/shoes?brands=${brand.id}`}
                className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 font-display text-md tracking-widest text-muted transition-all hover:bg-accent/5 hover:text-accent"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 opacity-70"
                  style={{ backgroundColor: brand.color ?? '#8c8c8c' }}
                />
                {brand.name}
              </Link>
            ))}
          </div>
        </div>
      </ScrollRevealSection>

      {/* Curation Section 0: 가성비 */}
      <section className="bg-dark py-20">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollRevealSection>
            <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                eyebrow="01 · 가성비"
                subhead="쿠션성·반응성·안정성·내구성 합산 ÷ 출시가 기준"
                eyebrowClassName="text-spec-value"
              >
                최고의 가성비
              </SectionHeading>
              <Link
                href="/shoes"
                className="font-mono text-eyebrow uppercase text-tertiary hover:text-accent transition-colors duration-200 ease-out-quart self-start sm:self-auto"
              >
                전체 보기 →
              </Link>
            </div>
          </ScrollRevealSection>
          <AnimatedCardGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {valueBest.map((shoe, i) => (
              <ShoeCard key={shoe.slug} shoe={shoe} priority={i < 2} />
            ))}
          </AnimatedCardGrid>
        </div>
      </section>

      {/* Curation Section 1: 반응성 */}
      <section className="bg-surface/30 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollRevealSection>
            <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                eyebrow="02 · 반응성"
                subhead="에너지리턴(ER%) 실측 측정값 기준"
                eyebrowClassName="text-spec-response"
              >
                최고의 에너지리턴
              </SectionHeading>
              <Link
                href="/shoes"
                className="font-mono text-eyebrow uppercase text-tertiary hover:text-accent transition-colors duration-200 ease-out-quart self-start sm:self-auto"
              >
                전체 보기 →
              </Link>
            </div>
          </ScrollRevealSection>
          <AnimatedCardGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {responsivenessBest.map((shoe) => (
              <ShoeCard key={shoe.slug} shoe={shoe} />
            ))}
          </AnimatedCardGrid>
        </div>
      </section>

      {/* Curation Section 2: 쿠션성 */}
      <section className="bg-dark py-20">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollRevealSection>
            <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                eyebrow="03 · 쿠션성"
                subhead="충격흡수(SA) 실측 측정값 기준"
                eyebrowClassName="text-spec-cushion"
              >
                최고의 쿠션성
              </SectionHeading>
              <Link
                href="/shoes"
                className="font-mono text-eyebrow uppercase text-tertiary hover:text-accent transition-colors duration-200 ease-out-quart self-start sm:self-auto"
              >
                전체 보기 →
              </Link>
            </div>
          </ScrollRevealSection>
          <AnimatedCardGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cushioningBest.map((shoe) => (
              <ShoeCard key={shoe.slug} shoe={shoe} />
            ))}
          </AnimatedCardGrid>
        </div>
      </section>
    </main>
  )
}
