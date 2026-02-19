'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import ShoeCard from './ShoeCard'
import ActiveFilterChips from './ActiveFilterChips'
import FilterDrawer from './FilterDrawer'
import FilterPanel from './FilterPanel'
import type { Shoe, Brand } from '@/lib/types'

interface Props {
  shoes: Shoe[]
  brands: Brand[]
  priceRange: { min: number; max: number }
  weightRange: { min: number; max: number }
  dropRange: { min: number; max: number }
}

export default function ShoesBrowser({
  shoes,
  brands,
  priceRange,
  weightRange,
  dropRange,
}: Props) {
  const searchParams = useSearchParams()

  const filtered = useMemo(() => {
    let result = [...shoes]

    const brandFilter = searchParams.get('brands')?.split(',').filter(Boolean) ?? []
    if (brandFilter.length > 0) {
      result = result.filter((s) => brandFilter.includes(s.brandId))
    }

    const category = searchParams.get('category')
    if (category) {
      result = result.filter((s) => s.categoryId === category)
    }

    const subcategory = searchParams.get('subcategory')
    if (subcategory) {
      result = result.filter((s) => s.subcategoryId === subcategory)
    }

    const maxPrice = searchParams.get('maxPrice')
    if (maxPrice) {
      result = result.filter((s) => s.price <= Number(maxPrice))
    }

    const maxWeight = searchParams.get('maxWeight')
    if (maxWeight) {
      result = result.filter((s) => s.specs.weight <= Number(maxWeight))
    }

    const maxDrop = searchParams.get('maxDrop')
    if (maxDrop) {
      result = result.filter((s) => s.specs.drop <= Number(maxDrop))
    }

    const sort = searchParams.get('sort') ?? 'recommended'
    if (sort === 'price-asc') result.sort((a, b) => a.price - b.price)
    else if (sort === 'price-desc') result.sort((a, b) => b.price - a.price)
    else if (sort === 'weight-asc') result.sort((a, b) => a.specs.weight - b.specs.weight)

    return result
  }, [shoes, searchParams])

  return (
    <div>
      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between mb-6">
        <p className="text-secondary text-sm font-body">
          <span className="text-primary font-bold">{filtered.length}</span>개 결과
        </p>
        <FilterDrawer
          brands={brands}
          priceRange={priceRange}
          weightRange={weightRange}
          dropRange={dropRange}
          totalCount={filtered.length}
        />
      </div>

      {/* Active chips */}
      <div className="mb-6">
        <ActiveFilterChips />
      </div>

      {/* Desktop layout */}
      <div className="flex gap-8">
        {/* Desktop filter panel */}
        <div className="hidden md:block">
          <FilterPanel
            brands={brands}
            priceRange={priceRange}
            weightRange={weightRange}
            dropRange={dropRange}
          />
        </div>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {/* Results count on desktop */}
          <p className="hidden md:block text-secondary text-sm font-body mb-6">
            <span className="text-primary font-bold">{filtered.length}</span>개 결과
          </p>

          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="font-display text-lg text-muted">결과 없음</p>
              <p className="text-secondary text-sm font-body mt-2">
                필터 조건을 바꿔보세요
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((shoe) => (
                <ShoeCard key={shoe.slug} shoe={shoe} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
