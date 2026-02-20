'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import ShoeCard from './ShoeCard'
import ActiveFilterChips from './ActiveFilterChips'
import FilterDrawer from './FilterDrawer'
import FilterPanel from './FilterPanel'
import type { Shoe, Brand } from '@/lib/types'

function getSpecValue(shoe: Shoe, sort: string): number {
  switch (sort) {
    case 'cushioning-desc':
      return shoe.specs.rawCushioning ?? shoe.specs.cushioning
    case 'responsiveness-desc':
      return shoe.specs.rawResponsiveness ?? shoe.specs.responsiveness
    case 'stability-desc': return shoe.specs.stability
    case 'durability-desc': return shoe.specs.durability
    case 'value-desc': return shoe.specs.valueScore ?? 0
    default: return 0
  }
}

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

    const minCush = searchParams.get('minCush')
    if (minCush) {
      result = result.filter((s) => s.specs.cushioning >= Number(minCush))
    }
    const minResp = searchParams.get('minResp')
    if (minResp) {
      result = result.filter((s) => s.specs.responsiveness >= Number(minResp))
    }
    const minStab = searchParams.get('minStab')
    if (minStab) {
      result = result.filter((s) => s.specs.stability >= Number(minStab))
    }
    const minDur = searchParams.get('minDur')
    if (minDur) {
      result = result.filter((s) => s.specs.durability >= Number(minDur))
    }
    const minWS = searchParams.get('minWS')
    if (minWS) {
      result = result.filter((s) => (s.specs.weightScore ?? 0) >= Number(minWS))
    }
    const minVS = searchParams.get('minVS')
    if (minVS) {
      result = result.filter((s) => (s.specs.valueScore ?? 0) >= Number(minVS))
    }

    const sort = searchParams.get('sort') ?? 'name-asc'

    const SPEC_SORT_KEYS = ['value', 'cushioning', 'responsiveness', 'stability', 'durability']

    result.sort((a, b) => {
      const isAsc = sort.endsWith('-asc')
      const baseKey = sort.replace(/-(?:asc|desc)$/, '')

      if (sort === 'name-asc') return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' })
      if (sort === 'name-desc') return b.name.localeCompare(a.name, 'en', { numeric: true, sensitivity: 'base' })

      let diff = 0
      if (SPEC_SORT_KEYS.includes(baseKey)) {
        const descKey = `${baseKey}-desc`
        diff = isAsc
          ? getSpecValue(a, descKey) - getSpecValue(b, descKey)
          : getSpecValue(b, descKey) - getSpecValue(a, descKey)
      } else {
        switch (sort) {
          case 'price-asc':   diff = a.price - b.price; break
          case 'price-desc':  diff = b.price - a.price; break
          case 'weight-asc':  diff = a.specs.weight - b.specs.weight; break
          case 'weight-desc': diff = b.specs.weight - a.specs.weight; break
        }
      }
      if (diff !== 0) return diff
      return a.slug.localeCompare(b.slug)
    })

    return result
  }, [shoes, searchParams])

  return (
    <div>
      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between mb-6">
        <p className="text-secondary text-sm font-body" aria-live="polite" aria-atomic="true">
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
          <p className="hidden md:block text-secondary text-sm font-body mb-6" aria-live="polite" aria-atomic="true">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
