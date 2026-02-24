import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { getShoeBySlug, getAllSlugs, getSimilarShoes } from '@/lib/data'
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

const CATEGORY_LABELS: Record<string, string> = {
  daily: '데일리',
  'super-trainer': '슈퍼트레이너',
  racing: '레이싱',
}

const BRAND_KOREA_URLS: Record<string, string> = {
  adidas: 'https://www.adidas.co.kr/',
  asics: 'https://www.asics.com/kr/ko-kr/',
  brooks: 'https://www.brooksrunning.com/ko_kr/',
  hoka: 'https://www.hoka.com/ko/ko/',
  mizuno: 'https://mizuno.com/kr/ko/',
  'new-balance': 'https://www.newbalance.co.kr/',
  nike: 'https://www.nike.com/kr/',
  puma: 'https://kr.puma.com/',
  saucony: 'https://www.saucony.com/',
}

const SOURCE_LABELS: Record<string, string> = {
  runrepeat: 'RunRepeat',
  rtings: 'RTINGS',
  dor: 'Doctors of Running',
  rtr: 'Road Trail Run',
  bitr: 'Believe in the Run',
}

export default function ShoeDetailPage({ params }: { params: { slug: string } }) {
  const shoe = getShoeBySlug(params.slug)
  if (!shoe) notFound()

  const related = getSimilarShoes(shoe, 3)
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

          {/* Spec radar + stat cards */}
          <section className="mb-8">
            <h2 className="font-display text-md text-primary tracking-widest uppercase mb-4">
              스펙
            </h2>
            <SpecRadar specs={shoe.specs} />

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
            {BRAND_KOREA_URLS[shoe.brandId] && (
              <a
                href={BRAND_KOREA_URLS[shoe.brandId]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-body text-secondary hover:text-accent transition-colors border border-elevated px-4 py-2 hover:border-accent/30 min-h-[44px]"
              >
                공식 사이트 ↗
              </a>
            )}
            {reviewLinks.length > 0 && (
              <details className="relative">
                <summary className="list-none inline-flex items-center gap-2 text-sm font-body text-secondary hover:text-accent transition-colors border border-elevated px-4 py-2 hover:border-accent/30 min-h-[44px] cursor-pointer select-none">
                  리뷰 {reviewLinks.length}개 ▾
                </summary>
                <div className="absolute right-0 top-full mt-1 z-10 bg-card border border-elevated min-w-[180px]">
                  {reviewLinks.map(({ key, url, label }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-3 text-sm font-body text-secondary hover:text-accent hover:bg-elevated transition-colors"
                    >
                      {label} <span className="ml-2 opacity-60">↗</span>
                    </a>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>

      <RelatedShoes shoes={related} />
    </main>
  )
}
