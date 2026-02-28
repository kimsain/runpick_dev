import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { getShoeBySlug, getAllSlugs, getSimilarShoes, getBrands } from '@/lib/data'
import { CATEGORY_LABELS, SOURCE_LABELS } from '@/lib/constants'
import RelatedShoes from '@/components/RelatedShoes'

const SpecRadar = dynamic(() => import('@/components/SpecRadar'), { ssr: false })

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const shoe = getShoeBySlug(params.slug)
  if (!shoe) notFound()
  return {
    title: `${shoe.name} — RunPick`,
    description: shoe.shortDescription,
    openGraph: {
      title: `${shoe.name} — RunPick`,
      description: shoe.shortDescription,
      images: [`/images${shoe.imageUrl}`],
    },
  }
}


export default function ShoeDetailPage({ params }: { params: { slug: string } }) {
  const shoe = getShoeBySlug(params.slug)
  if (!shoe) notFound()

  const related = getSimilarShoes(shoe, 3)
  const brand = getBrands().find((b) => b.id === shoe.brandId)
  const reviewLinks = shoe.sources
    ? (Object.entries(shoe.sources) as [string, string | undefined][])
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')
        .map(([key, url]) => ({ key, url, label: SOURCE_LABELS[key] ?? key }))
    : []
  const imagePath = `/images${shoe.imageUrl}`

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      {/* Desktop: 2-col sticky layout */}
      <div className="md:grid md:grid-cols-2 md:gap-16">
        {/* Left: sticky image */}
        <div className="md:sticky md:top-24 md:h-[calc(100vh-8rem)] flex items-center justify-center mb-8 md:mb-0">
          <div className="relative w-full max-w-sm aspect-square">
            <Image
              src={imagePath}
              alt={shoe.name}
              fill
              sizes="(max-width: 768px) 90vw, 40vw"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Right: scrollable content */}
        <div className="min-w-0">
          {/* Header */}
          <div className="mb-8">
            <p className="font-display text-sm text-secondary tracking-widest uppercase mb-1">
              {shoe.brandId.toUpperCase()} · {CATEGORY_LABELS[shoe.categoryId]}
            </p>
            <h1 className="font-display text-xl text-primary leading-tight mb-3">
              {shoe.name}
            </h1>
            <p className="font-display text-lg text-accent mb-4">{shoe.priceFormatted}</p>
            <p className="text-secondary text-sm font-body leading-relaxed">
              {shoe.shortDescription}
            </p>
          </div>

          {/* Low confidence warning banner */}
          {shoe.confidence === 'low' && (
            <div className="mb-8 bg-conf-low/5 border border-conf-low/20 p-4 flex gap-3" role="alert">
              <span className="w-2 h-2 mt-1.5 shrink-0 rounded-full bg-conf-low" />
              <div>
                <p className="text-sm font-body text-conf-low font-medium mb-1">
                  데이터 수집 중
                </p>
                <p className="text-sm font-body text-secondary leading-relaxed">
                  전문가 리뷰와 실측 데이터가 모두 없어, 유사 모델의 측정값으로 채운 점수입니다.
                  실제 성능과 크게 다를 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* Medium confidence info banner */}
          {shoe.confidence === 'medium' && (
            <div className="mb-8 bg-conf-medium/5 border border-conf-medium/20 p-4 flex gap-3" role="status">
              <span className="w-2 h-2 mt-1.5 shrink-0 rounded-full bg-conf-medium" />
              <div>
                <p className="text-sm font-body text-conf-medium font-medium mb-1">
                  리뷰 기반 추정
                </p>
                <p className="text-sm font-body text-secondary leading-relaxed">
                  실측 데이터는 없지만 전문가 리뷰(DOR · RTR · BITR)를 바탕으로 추정한 점수입니다.
                  실측 후 일부 수치가 변경될 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* Spec radar + stat cards */}
          <section className="mb-8">
            <h2 className="font-display text-md text-primary tracking-widest uppercase mb-4">
              스펙
              {shoe.confidence === 'medium' && (
                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-conf-medium align-middle" />
              )}
            </h2>
            <SpecRadar specs={shoe.specs} confidence={shoe.confidence} />

            {/* Numeric specs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
              <div className="bg-card border border-elevated p-3 sm:p-4 text-center">
                <p className="font-display text-base sm:text-lg text-accent">{shoe.specs.weight}</p>
                <p className="text-secondary text-sm font-body mt-1">g / 무게</p>
              </div>
              <div className="bg-card border border-elevated p-3 sm:p-4 text-center">
                <p className="font-display text-base sm:text-lg text-accent">{shoe.specs.drop}</p>
                <p className="text-secondary text-sm font-body mt-1">mm / 드롭</p>
              </div>
              <div className="bg-card border border-elevated p-3 sm:p-4 text-center">
                <p className="font-display text-base sm:text-lg text-accent whitespace-nowrap">
                  {shoe.specs.stackHeight.heel}/{shoe.specs.stackHeight.forefoot}
                </p>
                <p className="text-secondary text-sm font-body mt-1">mm / 스택</p>
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="mb-8">
            <h2 className="font-display text-md text-primary tracking-widest uppercase mb-4">
              리뷰
            </h2>
            <p className="text-secondary text-sm font-body leading-relaxed">
              {shoe.description}
            </p>
          </section>

          {/* Pros / Cons */}
          <section className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="font-display text-sm text-spec-response tracking-widest uppercase mb-3">
                  장점
                </h3>
                <ul className="space-y-2">
                  {shoe.pros.map((pro, i) => (
                    <li key={i} className="flex gap-2 text-sm font-body text-secondary">
                      <span className="text-spec-response mt-1 shrink-0">+</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-display text-sm text-spec-durability tracking-widest uppercase mb-3">
                  단점
                </h3>
                <ul className="space-y-2">
                  {shoe.cons.map((con, i) => (
                    <li key={i} className="flex gap-2 text-sm font-body text-secondary">
                      <span className="text-spec-durability mt-1 shrink-0">−</span>
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Best For */}
          <section className="mb-8">
            <h2 className="font-display text-md text-primary tracking-widest uppercase mb-4">
              이런 러너에게 추천
            </h2>
            <div className="flex flex-wrap gap-2">
              {shoe.bestFor.map((tag, i) => (
                <span
                  key={i}
                  className="text-sm font-body px-3 py-2 bg-accent/10 text-accent border border-accent/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          {/* Technologies */}
          {shoe.technologies.length > 0 && (
            <section className="mb-8">
              <h2 className="font-display text-md text-primary tracking-widest uppercase mb-4">
                주요 기술
              </h2>
              <div className="flex flex-wrap gap-2">
                {shoe.technologies.map((tech, i) => (
                  <span
                    key={i}
                    className="text-sm font-body px-3 py-2 bg-elevated text-secondary border border-elevated"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 링크 버튼 그룹 */}
          <div className="flex flex-wrap gap-2 items-start">
            {brand?.officialUrl && (
              <a
                href={brand.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-body text-secondary hover:text-accent transition-colors border border-elevated px-4 py-2 hover:border-accent/30 min-h-[44px]"
              >
                공식 사이트 ↗
              </a>
            )}
            {reviewLinks.map(({ key, url, label }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-body text-secondary hover:text-accent transition-colors border border-elevated px-4 py-2 hover:border-accent/30 min-h-[44px]"
              >
                {label} ↗
              </a>
            ))}
          </div>
        </div>
      </div>

      <RelatedShoes shoes={related} />
    </main>
  )
}
