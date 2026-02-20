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

const SORTS_META = [
  { key: 'name',           label: '이름',   defaultDir: 'asc'  as const },
  { key: 'value',          label: '가성비',  defaultDir: 'desc' as const },
  { key: 'cushioning',     label: '쿠션성',  defaultDir: 'desc' as const },
  { key: 'responsiveness', label: '반응성',  defaultDir: 'desc' as const },
  { key: 'stability',      label: '안정성',  defaultDir: 'desc' as const },
  { key: 'durability',     label: '내구성',  defaultDir: 'desc' as const },
  { key: 'weight',         label: '무게',    defaultDir: 'asc'  as const },
  { key: 'price',          label: '가격',    defaultDir: 'asc'  as const },
]

const VALID_SORTS = new Set([
  'name-asc','name-desc',
  'value-desc','value-asc','cushioning-desc','cushioning-asc',
  'responsiveness-desc','responsiveness-asc','stability-desc','stability-asc',
  'durability-desc','durability-asc','weight-asc','weight-desc','price-asc','price-desc',
])

function parseSort(s: string): [string, 'asc' | 'desc'] {
  if (!VALID_SORTS.has(s)) return ['name', 'asc']
  const dir = s.endsWith('-asc') ? 'asc' : 'desc'
  const key = dir === 'asc' ? s.slice(0, -4) : s.slice(0, -5)
  return [key, dir]
}

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
  { param: 'minCush', label: '쿠션성', color: 'spec-cushion' },
  { param: 'minResp', label: '반응성', color: 'spec-response' },
  { param: 'minStab', label: '안정성', color: 'spec-stability' },
  { param: 'minDur', label: '내구성', color: 'spec-durability' },
  { param: 'minWS',  label: '경량성', color: 'spec-weight' },
  { param: 'minVS',  label: '가성비', color: 'spec-value' },
]

function formatPrice(v: number) {
  return `${Math.round(v / 10000)}만`
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
  const [brandsOpen, setBrandsOpen] = useState(!!(searchParams.get('brands')))
  const [rangeOpen, setRangeOpen] = useState(
    !!(searchParams.get('maxPrice') || searchParams.get('maxWeight') || searchParams.get('maxDrop'))
  )

  const activeSpecCount = SPEC_FILTERS.filter(
    (f) => Number(searchParams.get(f.param) ?? 1) > 1
  ).length

  const selectedBrands = searchParams.get('brands')?.split(',').filter(Boolean) ?? []
  const category = searchParams.get('category') ?? 'all'
  const subcategory = searchParams.get('subcategory') ?? ''
  const maxPrice = Number(searchParams.get('maxPrice') ?? priceRange.max)
  const maxWeight = Number(searchParams.get('maxWeight') ?? weightRange.max)
  const maxDrop = Number(searchParams.get('maxDrop') ?? dropRange.max)
  const currentSort = searchParams.get('sort') ?? 'name-asc'
  const [activeKey, activeDir] = parseSort(currentSort)

  return (
    <aside className="w-60 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pr-2 scrollbar-hide">
      <div className="space-y-6 pb-8">
        {/* Sort */}
        <section>
          <h3 className="text-secondary text-sm font-display tracking-widest uppercase mb-2">정렬</h3>
          <div className="grid grid-cols-2 gap-2">
            {SORTS_META.map((s) => {
              const isActive = activeKey === s.key
              const dir = isActive ? activeDir : s.defaultDir
              const arrow = dir === 'desc' ? '↓' : '↑'
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    if (activeKey !== s.key) {
                      updateParam('sort', `${s.key}-${s.defaultDir}`)
                    } else {
                      const nextDir = activeDir === 'desc' ? 'asc' : 'desc'
                      updateParam('sort', `${s.key}-${nextDir}`)
                    }
                  }}
                  className={`text-sm font-body px-3 py-2 border transition-colors min-h-[44px] flex items-center justify-between ${
                    isActive
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-elevated text-secondary hover:border-secondary'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className={`text-xs transition-opacity ${isActive ? 'opacity-100' : 'opacity-25'}`}>{arrow}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Category */}
        <section>
          <h3 className="text-secondary text-sm font-display tracking-widest uppercase mb-2">카테고리</h3>
          <div className="grid grid-cols-2 gap-2">
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
                className={`text-sm font-body px-3 py-2 border transition-colors min-h-[44px] flex items-center justify-center text-center ${
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
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {SUBCATEGORY_MAP[category].map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => updateParam('subcategory', subcategory === sc.id ? '' : sc.id)}
                  className={`text-xs font-body px-2 py-1.5 border transition-colors min-h-[36px] flex items-center justify-center text-center ${
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
          <button
            onClick={() => setBrandsOpen(!brandsOpen)}
            className="w-full flex items-center justify-between text-secondary text-sm font-display tracking-widest uppercase mb-2"
          >
            <span>
              브랜드{selectedBrands.length > 0 && (
                <span className="text-accent normal-case font-body ml-1">({selectedBrands.length})</span>
              )}
            </span>
            <span className="text-xs">{brandsOpen ? '▲' : '▼'}</span>
          </button>
          {brandsOpen && (
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
          )}
        </section>

        {/* Range Filters */}
        <section>
          <button
            onClick={() => setRangeOpen(!rangeOpen)}
            className="w-full flex items-center justify-between text-secondary text-sm font-display tracking-widest uppercase mb-2"
          >
            <span>
              범위 필터{[searchParams.get('maxPrice'), searchParams.get('maxWeight'), searchParams.get('maxDrop')].filter(Boolean).length > 0 && (
                <span className="text-accent normal-case font-body ml-1">
                  ({[searchParams.get('maxPrice'), searchParams.get('maxWeight'), searchParams.get('maxDrop')].filter(Boolean).length}개 활성)
                </span>
              )}
            </span>
            <span className="text-xs">{rangeOpen ? '▲' : '▼'}</span>
          </button>
          {rangeOpen && (
            <div className="space-y-4">
              {/* 최대 가격 */}
              <div>
                <div className="flex justify-between text-sm font-body mb-1">
                  <span className="text-secondary">최대 가격(원)</span>
                  <span className="text-primary font-bold">{formatPrice(maxPrice)}</span>
                </div>
                <input
                  type="range"
                  min={priceRange.min}
                  max={priceRange.max}
                  step={10000}
                  value={maxPrice}
                  onChange={(e) =>
                    updateParam('maxPrice', Number(e.target.value) === priceRange.max ? '' : e.target.value)
                  }
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-muted text-xs font-body mt-1">
                  <span>{formatPrice(priceRange.min)}</span>
                  <span>{formatPrice(priceRange.max)}</span>
                </div>
              </div>
              {/* 최대 무게 */}
              <div>
                <div className="flex justify-between text-sm font-body mb-1">
                  <span className="text-secondary">최대 무게(g)</span>
                  <span className="text-primary font-bold">{maxWeight}</span>
                </div>
                <input
                  type="range"
                  min={weightRange.min}
                  max={weightRange.max}
                  step={1}
                  value={maxWeight}
                  onChange={(e) =>
                    updateParam('maxWeight', Number(e.target.value) === weightRange.max ? '' : e.target.value)
                  }
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-muted text-xs font-body mt-1">
                  <span>{weightRange.min}</span>
                  <span>{weightRange.max}</span>
                </div>
              </div>
              {/* 최대 드롭 */}
              <div>
                <div className="flex justify-between text-sm font-body mb-1">
                  <span className="text-secondary">드롭(mm)</span>
                  <span className="text-primary font-bold">{maxDrop}</span>
                </div>
                <input
                  type="range"
                  min={dropRange.min}
                  max={dropRange.max}
                  step={1}
                  value={maxDrop}
                  onChange={(e) =>
                    updateParam('maxDrop', Number(e.target.value) === dropRange.max ? '' : e.target.value)
                  }
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-muted text-xs font-body mt-1">
                  <span>{dropRange.min}</span>
                  <span>{dropRange.max}</span>
                </div>
              </div>
            </div>
          )}
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
                    <div className="flex justify-between items-center text-sm font-body mb-1">
                      <span className={`text-${f.color}`}>{f.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-primary font-bold">{val}</span>
                        {val > 1 && (
                          <button
                            onClick={() => updateParam(f.param, '')}
                            className="text-muted hover:text-primary text-xs leading-none"
                          >
                            ×
                          </button>
                        )}
                      </div>
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
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
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
