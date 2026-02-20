import { Suspense } from 'react'
import ShoesBrowser from '@/components/ShoesBrowser'
import { getAllShoes, getBrands, getPriceRange, getWeightRange, getDropRange } from '@/lib/data'

export const metadata = {
  title: '러닝화 탐색 — RunPick',
  description: '9개 브랜드 러닝화를 필터링하고 비교하세요.',
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] bg-card animate-pulse" />
      ))}
    </div>
  )
}

export default function ShoesPage() {
  const shoes = getAllShoes()
  const brands = getBrands()
  const priceRange = getPriceRange()
  const weightRange = getWeightRange()
  const dropRange = getDropRange()

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="font-display text-xl text-primary mb-2 tracking-widest uppercase">
        러닝화 탐색
      </h1>
      <p className="text-secondary text-sm font-body mb-10">
        {shoes.length}개 러닝화 · 9개 브랜드
      </p>

      <Suspense fallback={<GridSkeleton />}>
        <ShoesBrowser
          shoes={shoes}
          brands={brands}
          priceRange={priceRange}
          weightRange={weightRange}
          dropRange={dropRange}
        />
      </Suspense>
    </main>
  )
}
