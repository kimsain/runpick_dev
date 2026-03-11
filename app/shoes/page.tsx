import { Suspense } from 'react'
import ShoesBrowser from '@/components/ShoesBrowser'
import { getAllShoes, getBrands, getPriceRange, getWeightRange, getDropRange } from '@/lib/data'

export function generateMetadata() {
  return {
    title: '러닝화 탐색 — RunPick',
    description: `${getBrands().length}개 브랜드 러닝화를 필터링하고 비교하세요.`,
  }
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] rounded-xl bg-card animate-pulse" />
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
    <main className="max-w-7xl mx-auto px-6 py-12 sm:py-16">
      <div className="mb-10">
        <h1 className="font-display text-xl text-primary tracking-widest uppercase break-keep sm:text-2xl">
          러닝화 탐색
        </h1>
        <p className="mt-2 text-secondary text-sm font-body">
          {shoes.length}개 러닝화 · {brands.length}개 브랜드
        </p>
      </div>

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
