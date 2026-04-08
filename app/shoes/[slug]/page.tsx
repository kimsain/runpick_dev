import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import DetailImageViewer from '@/components/DetailImageViewer'
import { getShoeBySlug, getAllSlugs, getSimilarShoes, getBrands } from '@/lib/data'
import { CATEGORY_LABELS, SOURCE_LABELS } from '@/lib/constants'
import RelatedShoes from '@/components/RelatedShoes'
import ScoreMethodNotice from '@/components/ScoreMethodNotice'
import { STABILITY_METHOD_NOTICE } from '@/lib/scoreMethodNotice'
import Eyebrow from '@/components/ui/Eyebrow'
import SectionHeading from '@/components/ui/SectionHeading'

const SpecRadar = dynamic(() => import('@/components/SpecRadar'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-lg bg-elevated/50" />,
})

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
            <Eyebrow className="mb-2">{brand?.name ?? shoe.brandId} · {CATEGORY_LABELS[shoe.categoryId]}</Eyebrow>
            <h1 className="mb-3 text-2xl md:text-hero font-display tracking-tight-4 text-primary break-keep">
              {shoe.name}
            </h1>
            <p className="mb-4 text-xl font-display tabular-nums tracking-tight-2 text-accent">{shoe.priceFormatted}</p>
            <p className="max-w-lg text-sm font-body leading-relaxed text-secondary">
              {shoe.shortDescription}
            </p>
          </div>

          {/* Low confidence warning banner */}
          {shoe.confidence === 'low' && (
            <div className="flex gap-3 rounded-xl shadow-ring bg-conf-low/5 p-5" role="alert">
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
            <div className="flex gap-3 rounded-xl shadow-ring bg-conf-medium/5 p-5" role="status">
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
          <section className="rounded-2xl shadow-card bg-card p-6">
            <SectionHeading eyebrow="SPEC RADAR" className="mb-6">
              스펙
              {shoe.confidence === 'medium' && (
                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-conf-medium align-middle" />
              )}
            </SectionHeading>
            <ScoreMethodNotice
              notice={STABILITY_METHOD_NOTICE}
              linkHref="/methodology"
              linkLabel="점수 산정 방법 보기"
              className="mb-4"
            />
            <SpecRadar specs={shoe.specs} confidence={shoe.confidence} />

            {/* Numeric specs */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl shadow-card bg-card p-5 text-center">
                <p className="text-2xl font-display tabular-nums tracking-tight-3 text-primary">
                  {shoe.specs.weight}<span className="text-sm text-tertiary ml-1">g</span>
                </p>
                <Eyebrow className="mt-2">무게</Eyebrow>
              </div>
              <div className="rounded-xl shadow-card bg-card p-5 text-center">
                <p className="text-2xl font-display tabular-nums tracking-tight-3 text-primary">
                  {shoe.specs.drop}<span className="text-sm text-tertiary ml-1">mm</span>
                </p>
                <Eyebrow className="mt-2">드롭</Eyebrow>
              </div>
              <div className="rounded-xl shadow-card bg-card p-5 text-center">
                <p className="whitespace-nowrap text-2xl font-display tabular-nums tracking-tight-3 text-primary">
                  {shoe.specs.stackHeight.heel}/{shoe.specs.stackHeight.forefoot}<span className="text-sm text-tertiary ml-1">mm</span>
                </p>
                <Eyebrow className="mt-2">스택</Eyebrow>
              </div>
            </div>
          </section>

          {/* Description */}
          <section>
            <SectionHeading eyebrow="REVIEW" className="mb-6">리뷰</SectionHeading>
            <p className="text-secondary text-sm font-body leading-relaxed">
              {shoe.description}
            </p>
          </section>

          {/* Pros / Cons */}
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-spec-response/10 bg-spec-response/[0.04] p-5">
                <Eyebrow as="div" className="mb-3 text-spec-response">+ 장점</Eyebrow>
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
                <Eyebrow as="div" className="mb-3 text-spec-durability">– 단점</Eyebrow>
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
            <Eyebrow as="div" className="mb-3">이런 러너에게</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {shoe.bestFor.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-spec-value/10 text-spec-value px-3 py-1.5 text-xs font-medium tracking-tight-1"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>

          {/* Technologies */}
          {shoe.technologies.length > 0 && (
            <section>
              <Eyebrow as="div" className="mb-3">주요 기술</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {shoe.technologies.map((tech, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full shadow-ring font-mono text-eyebrow uppercase text-tertiary px-3 py-1.5"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* 링크 버튼 그룹 */}
          <div className="border-t border-border pt-4" aria-label="구매 및 리뷰 링크">
            <div className="flex flex-wrap items-start gap-2">
              {brand?.officialUrl && (
                <a
                  href={brand.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="공식 사이트 (새 탭에서 열림)"
                  className="inline-flex items-center justify-center min-h-[44px] rounded-xl bg-accent text-dark font-display text-md tracking-tight-2 px-5 py-3 shadow-feature hover:shadow-card-hover transition-shadow duration-250 ease-out-quart"
                >
                  공식 사이트
                </a>
              )}
              {reviewLinks.map(({ key, url, label }) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between min-h-[44px] rounded-xl shadow-ring hover:shadow-card font-mono text-eyebrow uppercase text-tertiary hover:text-primary px-4 py-3 transition-shadow duration-200 ease-out-quart"
                >
                  {label} →
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RelatedShoes shoes={related} />
    </main>
  )
}
