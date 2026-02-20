'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState } from 'react'
import type { Brand } from '@/lib/types'

interface Props {
  brands: Brand[]
  priceRange: { min: number; max: number }
  weightRange: { min: number; max: number }
  dropRange: { min: number; max: number }
}

const CATEGORIES = [
  { id: 'all', label: '전체' },
  { id: 'daily', label: '데일리' },
  { id: 'super-trainer', label: '슈퍼트레이너' },
  { id: 'racing', label: '레이싱' },
]

const SORTS = [
  { id: 'recommended', label: '추천순' },
  { id: '_sep1', label: '' },
  { id: 'price-asc', label: '가격 낮은순' },
  { id: 'price-desc', label: '가격 높은순' },
  { id: '_sep2', label: '' },
  { id: 'value-desc', label: '가성비 높은순' },
  { id: 'cushioning-desc', label: '쿠션성 높은순' },
  { id: 'responsiveness-desc', label: '반응성 높은순' },
  { id: 'stability-desc', label: '안정성 높은순' },
  { id: 'durability-desc', label: '내구성 높은순' },
  { id: 'lightness-desc', label: '경량성 높은순' },
  { id: '_sep3', label: '' },
  { id: 'weight-asc', label: '무게 가벼운순' },
  { id: 'newest', label: '최신순' },
]

const SUBCATEGORY_MAP: Record<string, { id: string; label: string }[]> = {
  daily: [
    { id: 'entry', label: '입문' },
    { id: 'max-cushion', label: '맥스쿠션' },
    { id: 'all-rounder', label: '올라운드' },
    { id: 'stability', label: '안정화' },
    { id: 'lightweight', label: '경량' },
  ],
  'super-trainer': [
    { id: 'no-plate', label: '플레이트리스' },
    { id: 'light-plate', label: '라이트 플레이트' },
    { id: 'carbon-plate', label: '카본 플레이트' },
  ],
  racing: [
    { id: 'half', label: '하프' },
    { id: 'full', label: '풀' },
  ],
}

const SPEC_FILTERS = [
  { param: 'minCush', label: '쿠션', color: 'spec-cushion' },
  { param: 'minResp', label: '반응', color: 'spec-response' },
  { param: 'minStab', label: '안정', color: 'spec-stability' },
  { param: 'minDur', label: '내구', color: 'spec-durability' },
  { param: 'minWS', label: '경량', color: 'spec-weight' },
  { param: 'minVS', label: '가성비', color: 'spec-value' },
]

function formatPrice(v: number) {
  return `₩${(v / 10000).toFixed(0)}만`
}

export default function FilterPanel({ brands, priceRange, weightRange, dropRange }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const toggleBrand = useCallback(
    (brandId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      const current = params.get('brands')?.split(',').filter(Boolean) ?? []
      const next = current.includes(brandId)
        ? current.filter((b) => b !== brandId)
        : [...current, brandId]
      if (next.length) {
        params.set('brands', next.join(','))
      } else {
        params.delete('brands')
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const [specOpen, setSpecOpen] = useState(false)

  const activeSpecCount = SPEC_FILTERS.filter(
    (f) => Number(searchParams.get(f.param) ?? 1) > 1
  ).length

  const selectedBrands = searchParams.get('brands')?.split(',').filter(Boolean) ?? []
  const category = searchParams.get('category') ?? 'all'
  const subcategory = searchParams.get('subcategory') ?? ''
  const maxPrice = Number(searchParams.get('maxPrice') ?? priceRange.max)
  const maxWeight = Number(searchParams.get('maxWeight') ?? weightRange.max)
  const maxDrop = Number(searchParams.get('maxDrop') ?? dropRange.max)
  const sort = searchParams.get('sort') ?? 'recommended'

  return (
    <aside className="w-60 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pr-2 scrollbar-hide">
      <div className="space-y-6 pb-8">
        {/* Sort */}
        <section>
          <h3 className="text-secondary text-sm font-display tracking-widest uppercase mb-2">정렬</h3>
          <div className="space-y-1">
            {SORTS.map((s) =>
              s.id.startsWith('_sep') ? (
                <hr key={s.id} className="border-elevated my-1" />
              ) : (
                <button
                  key={s.id}
                  onClick={() => updateParam('sort', s.id === 'recommended' ? '' : s.id)}
                  className={`w-full text-left text-sm font-body px-2 py-2 rounded transition-colors min-h-[44px] flex items-center ${
                    sort === s.id
                      ? 'text-accent bg-accent/10'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {s.label}
                </button>
              )
            )}
          </div>
        </section>

        {/* Category */}
        <section>
          <h3 className="text-secondary text-sm font-display tracking-widest uppercase mb-2">카테고리</h3>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString())
                  if (c.id === 'all') {
                    params.delete('category')
                  } else {
                    params.set('category', c.id)
                  }
                  params.delete('subcategory')
                  router.push(`${pathname}?${params.toString()}`)
                }}
                className={`text-sm font-body px-3 py-2 border transition-colors min-h-[44px] flex items-center ${
                  category === c.id
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-elevated text-secondary hover:border-secondary'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {category !== 'all' && SUBCATEGORY_MAP[category] && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SUBCATEGORY_MAP[category].map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => updateParam('subcategory', subcategory === sc.id ? '' : sc.id)}
                  className={`text-xs font-body px-2 py-1.5 border rounded transition-colors min-h-[36px] flex items-center ${
                    subcategory === sc.id
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-elevated text-secondary hover:border-secondary'
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Brands */}
        <section>
          <h3 className="text-secondary text-sm font-display tracking-widest uppercase mb-2">브랜드</h3>
          <div className="space-y-1">
            {brands.map((brand) => (
              <label
                key={brand.id}
                className="flex items-center gap-2 cursor-pointer group min-h-[44px]"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.id)}
                  onChange={() => toggleBrand(brand.id)}
                  className="sr-only"
                />
                <span
                  className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${
                    selectedBrands.includes(brand.id)
                      ? 'border-accent bg-accent'
                      : 'border-elevated group-hover:border-secondary'
                  }`}
                >
                  {selectedBrands.includes(brand.id) && (
                    <svg className="w-3 h-3 text-base" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                  )}
                </span>
                <span
                  className={`text-sm font-body transition-colors ${
                    selectedBrands.includes(brand.id) ? 'text-primary' : 'text-secondary group-hover:text-primary'
                  }`}
                >
                  {brand.name}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Price */}
        <section>
          <h3 className="text-secondary text-sm font-display tracking-widest uppercase mb-2">
            최대 가격{' '}
            <span className="text-primary normal-case font-body font-bold">{formatPrice(maxPrice)}</span>
          </h3>
          <input
            type="range"
            min={priceRange.min}
            max={priceRange.max}
            step={10000}
            value={maxPrice}
            onChange={(e) =>
              updateParam(
                'maxPrice',
                Number(e.target.value) === priceRange.max ? '' : e.target.value
              )
            }
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-muted text-sm font-body mt-1">
            <span>{formatPrice(priceRange.min)}</span>
            <span>{formatPrice(priceRange.max)}</span>
          </div>
        </section>

        {/* Weight */}
        <section>
          <h3 className="text-secondary text-sm font-display tracking-widest uppercase mb-2">
            최대 무게{' '}
            <span className="text-primary normal-case font-body font-bold">{maxWeight}g</span>
          </h3>
          <input
            type="range"
            min={weightRange.min}
            max={weightRange.max}
            step={5}
            value={maxWeight}
            onChange={(e) =>
              updateParam(
                'maxWeight',
                Number(e.target.value) === weightRange.max ? '' : e.target.value
              )
            }
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-muted text-sm font-body mt-1">
            <span>{weightRange.min}g</span>
            <span>{weightRange.max}g</span>
          </div>
        </section>

        {/* Drop */}
        <section>
          <h3 className="text-secondary text-sm font-display tracking-widest uppercase mb-2">
            최대 드롭{' '}
            <span className="text-primary normal-case font-body font-bold">{maxDrop}mm</span>
          </h3>
          <input
            type="range"
            min={dropRange.min}
            max={dropRange.max}
            step={1}
            value={maxDrop}
            onChange={(e) =>
              updateParam(
                'maxDrop',
                Number(e.target.value) === dropRange.max ? '' : e.target.value
              )
            }
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-muted text-sm font-body mt-1">
            <span>{dropRange.min}mm</span>
            <span>{dropRange.max}mm</span>
          </div>
        </section>

        {/* Spec Filters */}
        <section>
          <button
            onClick={() => setSpecOpen(!specOpen)}
            className="w-full flex items-center justify-between text-secondary text-sm font-display tracking-widest uppercase mb-2"
          >
            <span>
              스펙 필터{activeSpecCount > 0 && (
                <span className="text-accent normal-case font-body ml-1">({activeSpecCount}개 활성)</span>
              )}
            </span>
            <span className="text-xs">{specOpen ? '▲' : '▼'}</span>
          </button>
          {specOpen && (
            <div className="space-y-4">
              {SPEC_FILTERS.map((f) => {
                const val = Number(searchParams.get(f.param) ?? 1)
                return (
                  <div key={f.param}>
                    <div className="flex justify-between text-sm font-body mb-1">
                      <span className={`text-${f.color}`}>{f.label}</span>
                      <span className="text-primary font-bold">{val}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={val}
                      onChange={(e) =>
                        updateParam(f.param, Number(e.target.value) > 1 ? e.target.value : '')
                      }
                      className="w-full"
                      style={{ accentColor: `var(--${f.color})` }}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}
