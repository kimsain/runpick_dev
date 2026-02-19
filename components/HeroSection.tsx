import Image from 'next/image'
import Link from 'next/link'
import { getAllShoes } from '@/lib/data'

const CHECKER_SLUGS = [
  'alphafly-3',
  'bondi-9',
  'adizero-adios-pro-4',
  'novablast-5',
  'gel-nimbus-28',
  'fuelcell-sc-elite-v5',
  'endorphin-elite-2',
  'wave-rebellion-pro-3',
  'ghost-17',
  'vomero-premium',
  'deviate-nitro-elite-3',
  'metaspeed-sky-tokyo',
  'pegasus-41',
  'clifton-10',
  'ride-18',
  'gel-kayano-32',
  'hyperion-3',
  'velocity-nitro-4',
]

export default function HeroSection() {
  const shoes = getAllShoes()
  const totalCount = shoes.length

  return (
    <section className="relative h-screen min-h-[600px] flex items-end overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-6 gap-1">
        {CHECKER_SLUGS.map((slug) => (
          <div key={slug} className="relative">
            <Image
              src={`/images/shoes/${slug}.webp`}
              alt={slug}
              fill
              sizes="25vw"
              className="object-contain p-2"
              style={{ opacity: 0.25 }}
            />
          </div>
        ))}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-base via-base/60 to-base/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-base/80 via-transparent to-transparent" />

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
          className="inline-flex items-center gap-3 bg-accent text-base font-display text-xl px-6 py-4 hover:bg-accent/90 transition-colors min-h-[44px]"
        >
          신발 탐색 →
        </Link>
      </div>
    </section>
  )
}
