'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useDeferredValue, useMemo } from 'react'
import ShoeCard from './ShoeCard'
import AnimatedCardGrid from './AnimatedCardGrid'
import ActiveFilterChips from './ActiveFilterChips'
import FilterDrawer from './FilterDrawer'
import FilterPanel from './FilterPanel'
import ShoesSearchBar from './ShoesSearchBar'
import EmptyState from '@/components/ui/EmptyState'
import type { Shoe, Brand } from '@/lib/types'
import { getShoeSearchRank, normalizeSearchText } from '@/lib/shoeSearch'

function getSpecValue(shoe: Shoe, sort: string): number {
  switch (sort) {
    case 'cushioning-desc':     return (shoe.specs.cushioning ?? 0) * 100 + (shoe.specs.rawCushioning ?? shoe.specs.cushioning ?? 0)
    case 'responsiveness-desc': return (shoe.specs.responsiveness ?? 0) * 100 + (shoe.specs.rawResponsiveness ?? shoe.specs.responsiveness ?? 0)
    case 'stability-desc':      return (shoe.specs.stability ?? 0) * 100 + (shoe.specs.rawStability ?? shoe.specs.stability ?? 0)
    case 'durability-desc':     return (shoe.specs.durability ?? 0) * 100 + (shoe.specs.rawDurability ?? shoe.specs.durability ?? 0)
    case 'value-desc':          return (shoe.specs.valueScore ?? 0) * 100 + (shoe.specs.rawValueScore ?? shoe.specs.valueScore ?? 0)
    default: return 0
  }
}

function compareShoes(a: Shoe, b: Shoe, sort: string): number {
  const isAsc = sort.endsWith('-asc')
  const baseKey = sort.replace(/-(?:asc|desc)$/, '')

  if (sort === 'name-asc') return a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' })
  if (sort === 'name-desc') return b.name.localeCompare(a.name, 'en', { numeric: true, sensitivity: 'base' })

  const specSortKeys = ['value', 'cushioning', 'responsiveness', 'stability', 'durability']

  let diff = 0
  if (specSortKeys.includes(baseKey)) {
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const deferredQuery = useDeferredValue(searchParams.get('q') ?? '')
  const brandMap = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand])),
    [brands]
  )

  const currentSort = searchParams.get('sort') ?? 'name-asc'

  const filteredWithoutQuery = useMemo(() => {
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

    result.sort((a, b) => compareShoes(a, b, currentSort))

    return result
  }, [currentSort, searchParams, shoes])

  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSearchText(deferredQuery)
    if (!normalizedQuery) {
      return filteredWithoutQuery
    }

    return filteredWithoutQuery
      .map((shoe) => {
        const rank = getShoeSearchRank(shoe, brandMap.get(shoe.brandId), normalizedQuery)
        if (!rank) {
          return null
        }

        return { shoe, rank }
      })
      .filter((entry): entry is { shoe: Shoe; rank: NonNullable<ReturnType<typeof getShoeSearchRank>> } => entry !== null)
      .sort((a, b) => {
        const scoreDiff = b.rank.totalScore - a.rank.totalScore
        if (scoreDiff !== 0) return scoreDiff

        if (b.rank.directScore !== a.rank.directScore) {
          return b.rank.directScore - a.rank.directScore
        }

        return compareShoes(a.shoe, b.shoe, currentSort)
      })
      .map((entry) => entry.shoe)
  }, [brandMap, currentSort, deferredQuery, filteredWithoutQuery])

  return (
    <div>
      <ShoesSearchBar shoes={filteredWithoutQuery} brands={brands} />

      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between mb-6">
        <p className="text-sm text-tertiary font-mono tabular-nums tracking-tight-1" aria-live="polite" aria-atomic="true">
          <span className="text-primary font-medium">{filtered.length}</span> 개 결과
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
      <ActiveFilterChips />

      {/* Desktop layout */}
      <div className="flex gap-10">
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
          <p className="hidden md:block text-sm text-tertiary font-mono tabular-nums tracking-tight-1 mb-6" aria-live="polite" aria-atomic="true">
            <span className="text-primary font-medium">{filtered.length}</span> 개 결과
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              eyebrow="NO MATCHES"
              title="결과 없음"
              description="필터 조건을 바꿔보세요"
              action={
                <button
                  onClick={() => router.push(pathname)}
                  className="rounded-full bg-accent text-dark font-display text-sm tracking-tight-1 px-4 py-2 hover:shadow-feature transition-shadow duration-250 ease-out-quart"
                >
                  필터 초기화
                </button>
              }
            />
          ) : (
            <AnimatedCardGrid
              disableStagger
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((shoe) => (
                <ShoeCard key={shoe.slug} shoe={shoe} />
              ))}
            </AnimatedCardGrid>
          )}
        </div>
      </div>
    </div>
  )
}
