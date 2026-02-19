import Link from 'next/link'
import Image from 'next/image'
import HeroSection from '@/components/HeroSection'
import ShoeCard from '@/components/ShoeCard'
import { getAllShoes, getBrands } from '@/lib/data'

const PURPOSE_CARDS = [
  {
    title: '입문',
    desc: '처음 러닝, 부담 없이 시작하기',
    href: '/shoes?category=daily',
    color: '#38BDF8',
    imageSlug: 'pegasus-41',
  },
  {
    title: '데일리',
    desc: '매일 신는 든든한 트레이너',
    href: '/shoes?category=daily',
    color: '#C8FF00',
    imageSlug: 'clifton-10',
  },
  {
    title: '슈퍼트레이너',
    desc: '템포·인터벌을 위한 플레이티드 트레이너',
    href: '/shoes?category=super-trainer',
    color: '#FBBF24',
    imageSlug: 'superblast-2',
  },
  {
    title: '레이스',
    desc: '기록을 위한 카본 플레이트 레이서',
    href: '/shoes?category=racing',
    color: '#F87171',
    imageSlug: 'alphafly-3',
  },
]

export default function HomePage() {
  const allShoes = getAllShoes()
  const brands = getBrands()
  const featured = allShoes
    .slice()
    .sort((a, b) => {
      const scoreA = a.specs.cushioning + a.specs.responsiveness + a.specs.stability + a.specs.durability
      const scoreB = b.specs.cushioning + b.specs.responsiveness + b.specs.stability + b.specs.durability
      return scoreB - scoreA
    })
    .slice(0, 8)

  return (
    <main>
      <HeroSection />

      {/* Purpose Cards */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="font-display text-lg text-primary mb-8 tracking-widest uppercase">
          목적별 탐색
        </h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {PURPOSE_CARDS.map((card) => {
            const shoe = allShoes.find((s) => s.slug === card.imageSlug)
            const imagePath = shoe ? `/images${shoe.imageUrl}` : ''

            return (
              <Link
                key={card.title}
                href={card.href}
                className="group relative shrink-0 w-56 h-72 overflow-hidden bg-card border border-elevated hover:border-accent/40 transition-colors"
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

      {/* Featured Shoes */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display text-lg text-primary tracking-widest uppercase">
            주목할 러닝화
          </h2>
          <Link
            href="/shoes"
            className="text-xs font-body text-secondary hover:text-accent transition-colors"
          >
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {featured.map((shoe, i) => (
            <ShoeCard key={shoe.slug} shoe={shoe} priority={i < 4} />
          ))}
        </div>
      </section>
    </main>
  )
}
