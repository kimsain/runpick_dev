import Image from 'next/image'
import Link from 'next/link'
import { getAllShoes } from '@/lib/data'

export default function HeroSection() {
  const shoes = getAllShoes()
  const featuredShoe = shoes.find((s) => s.slug === 'vaporfly-4') ?? shoes[0]
  const imagePath = `/images${featuredShoe.imageUrl}`
  const totalCount = shoes.length

  return (
    <section className="relative h-screen min-h-[600px] flex items-end overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src={imagePath}
          alt={featuredShoe.name}
          fill
          sizes="100vw"
          className="object-contain object-center scale-110"
          priority
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/60 to-base/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-base/80 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-24">
        <p className="text-secondary text-sm font-body tracking-widest uppercase mb-4">
          러닝화 탐색 플랫폼
        </p>
        <h1 className="font-display text-hero leading-none text-accent mb-4">
          FIND YOUR
          <br />
          RUN
        </h1>
        <p className="text-secondary text-base font-body max-w-md mb-8">
          9개 브랜드 {totalCount}개 러닝화 데이터를 기반으로
          <br />
          당신에게 맞는 러닝화를 찾아보세요.
        </p>
        <Link
          href="/shoes"
          className="inline-flex items-center gap-3 bg-accent text-base font-display text-xl px-8 py-4 hover:bg-accent/90 transition-colors min-h-[44px]"
        >
          {totalCount}개 신발 탐색 →
        </Link>
      </div>
    </section>
  )
}
