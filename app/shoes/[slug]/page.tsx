import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import DetailImageViewer from '@/components/DetailImageViewer'
import { getShoeBySlug, getAllSlugs, getSimilarShoes, getBrands } from '@/lib/data'
import { CATEGORY_LABELS, SOURCE_LABELS } from '@/lib/constants'
import RelatedShoes from '@/components/RelatedShoes'
import ScoreMethodNotice from '@/components/ScoreMethodNotice'
import { STABILITY_METHOD_NOTICE } from '@/lib/scoreMethodNotice'

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
    <main className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
      {/* Desktop: 2-col sticky layout */}
      <div className="md:grid md:grid-cols-2 md:gap-16">
        {/* Left: sticky image */}
        <div className="md:sticky md:top-24 md:h-[calc(100vh-8rem)] flex items-center justify-center mb-8 md:mb-0">
          <div className="w-full max-w-md">
            <DetailImageViewer src={imagePath} alt={shoe.name} priority />
          </div>
        </div>

        {/* Right: scrollable content */}
        <div className="min-w-0 space-y-8">
          {/* Header */}
          <div>
            <p className="mb-2 text-sm font-display uppercase tracking-widest text-secondary">
              {shoe.brandId.toUpperCase()} · {CATEGORY_LABELS[shoe.categoryId]}
            </p>
            <h1 className="mb-3 text-xl font-display leading-tight text-primary break-keep sm:text-2xl">
              {shoe.name}
            </h1>
            <p className="mb-4 text-lg font-display text-accent">{shoe.priceFormatted}</p>
            <p className="max-w-lg text-sm font-body leading-relaxed text-secondary">
              {shoe.shortDescription}
            </p>
          </div>

          {/* Low confidence warning banner */}
          {shoe.confidence === 'low' && (
            <div className="flex gap-3 rounded-xl border border-conf-low/20 bg-conf-low/5 p-5" role="alert">
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
            <div className="flex gap-3 rounded-xl border border-conf-medium/20 bg-conf-medium/5 p-5" role="status">
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
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-4 text-md font-display uppercase tracking-widest text-primary break-keep">
              스펙
              {shoe.confidence === 'medium' && (
                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-conf-medium align-middle" />
              )}
            </h2>
            <ScoreMethodNotice
              notice={STABILITY_METHOD_NOTICE}
              linkHref="/methodology"
              linkLabel="점수 산정 방법 보기"
              className="mb-4"
            />
            <SpecRadar specs={shoe.specs} confidence={shoe.confidence} />

            {/* Numeric specs */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-elevated p-4 text-center">
                <p className="text-base font-display text-accent sm:text-lg">{shoe.specs.weight}</p>
                <p className="mt-1 text-xs font-body text-muted sm:text-sm">g / 무게</p>
              </div>
              <div className="rounded-xl bg-elevated p-4 text-center">
                <p className="text-base font-display text-accent sm:text-lg">{shoe.specs.drop}</p>
                <p className="mt-1 text-xs font-body text-muted sm:text-sm">mm / 드롭</p>
              </div>
              <div className="rounded-xl bg-elevated p-4 text-center">
                <p className="whitespace-nowrap text-base font-display text-accent sm:text-lg">
                  {shoe.specs.stackHeight.heel}/{shoe.specs.stackHeight.forefoot}
                </p>
                <p className="mt-1 text-xs font-body text-muted sm:text-sm">mm / 스택</p>
              </div>
            </div>
          </section>

          {/* Description */}
          <section>
            <h2 className="mb-4 text-md font-display uppercase tracking-widest text-primary break-keep">
              리뷰
            </h2>
            <p className="text-secondary text-sm font-body leading-relaxed">
              {shoe.description}
            </p>
          </section>

          {/* Pros / Cons */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-spec-response/10 bg-spec-response/[0.04] p-5">
                <h3 className="mb-4 text-sm font-display uppercase tracking-widest text-spec-response break-keep">
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
              <div className="rounded-xl border border-spec-durability/10 bg-spec-durability/[0.04] p-5">
                <h3 className="mb-4 text-sm font-display uppercase tracking-widest text-spec-durability break-keep">
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
          <section>
            <h2 className="mb-4 text-md font-display uppercase tracking-widest text-primary break-keep">
              이런 러너에게 추천
            </h2>
            <div className="flex flex-wrap gap-2">
              {shoe.bestFor.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full bg-elevated px-4 py-2 text-sm font-body text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          {/* Technologies */}
          {shoe.technologies.length > 0 && (
            <section>
              <h2 className="mb-4 text-md font-display uppercase tracking-widest text-primary break-keep">
                주요 기술
              </h2>
              <div className="flex flex-wrap gap-2">
                {shoe.technologies.map((tech, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-border bg-elevated px-4 py-2 text-sm font-body text-secondary"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 링크 버튼 그룹 */}
          <section className="border-t border-border pt-4">
            <div className="flex flex-wrap items-start gap-2">
              {brand?.officialUrl && (
                <a
                  href={brand.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-body text-secondary transition-all hover:border-accent/20 hover:bg-accent/5 hover:text-accent"
                >
                  공식 사이트
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
              {reviewLinks.map(({ key, url, label }) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-body text-secondary transition-all hover:border-accent/20 hover:bg-accent/5 hover:text-accent"
                >
                  {label}
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>

      <RelatedShoes shoes={related} />
    </main>
  )
}
