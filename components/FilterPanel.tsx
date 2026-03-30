'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import type { Brand } from '@/lib/types'
import { CATEGORIES, SPEC_LABELS } from '@/lib/constants'

interface Props {
  brands: Brand[]
  priceRange: { min: number; max: number }
  weightRange: { min: number; max: number }
  dropRange: { min: number; max: number }
  mobile?: boolean
}


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

const SPEC_FILTERS = [
  { param: 'minCush', label: SPEC_LABELS.cushioning,     colorVar: '--spec-cushion', textClass: 'text-spec-cushion' },
  { param: 'minResp', label: SPEC_LABELS.responsiveness, colorVar: '--spec-response', textClass: 'text-spec-response' },
  { param: 'minStab', label: SPEC_LABELS.stability,      colorVar: '--spec-stability', textClass: 'text-spec-stability' },
  { param: 'minDur',  label: SPEC_LABELS.durability,     colorVar: '--spec-durability', textClass: 'text-spec-durability' },
  { param: 'minWS',   label: SPEC_LABELS.weightScore,    colorVar: '--spec-weight', textClass: 'text-spec-weight' },
  { param: 'minVS',   label: SPEC_LABELS.valueScore,     colorVar: '--spec-value', textClass: 'text-spec-value' },
]

function formatPrice(v: number) {
  return `${Math.round(v / 10000)}만`
}

export default function FilterPanel({ brands, priceRange, weightRange, dropRange, mobile }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname]
  )

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      pushParams(params)
    },
    [pushParams, searchParams]
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
      pushParams(params)
    },
    [pushParams, searchParams]
  )

  const activeSpecCount = SPEC_FILTERS.filter(
    (f) => Number(searchParams.get(f.param) ?? 1) > 1
  ).length

  const [specOpen, setSpecOpen] = useState(activeSpecCount > 0)
  const [brandsOpen, setBrandsOpen] = useState(!!(searchParams.get('brands')))
  const [rangeOpen, setRangeOpen] = useState(
    !!(searchParams.get('maxPrice') || searchParams.get('maxWeight') || searchParams.get('maxDrop'))
  )

  const selectedBrands = searchParams.get('brands')?.split(',').filter(Boolean) ?? []
  const category = searchParams.get('category') ?? 'all'
  const sliderWeightMin = Math.floor(weightRange.min / 10) * 10
  const sliderWeightMax = Math.ceil(weightRange.max / 10) * 10

  const urlMaxPrice = Number(searchParams.get('maxPrice') ?? priceRange.max)
  const urlMaxWeight = Number(searchParams.get('maxWeight') ?? sliderWeightMax)
  const urlMaxDrop = Number(searchParams.get('maxDrop') ?? dropRange.max)

  const [localMaxPrice, setLocalMaxPrice] = useState(urlMaxPrice)
  const [localMaxWeight, setLocalMaxWeight] = useState(urlMaxWeight)
  const [localMaxDrop, setLocalMaxDrop] = useState(urlMaxDrop)

  useEffect(() => { setLocalMaxPrice(urlMaxPrice) }, [urlMaxPrice])
  useEffect(() => { setLocalMaxWeight(urlMaxWeight) }, [urlMaxWeight])
  useEffect(() => { setLocalMaxDrop(urlMaxDrop) }, [urlMaxDrop])

  useEffect(() => {
    if (localMaxPrice === urlMaxPrice) return
    const t = setTimeout(() => updateParam('maxPrice', localMaxPrice >= priceRange.max ? '' : String(localMaxPrice)), 200)
    return () => clearTimeout(t)
  }, [localMaxPrice, urlMaxPrice, priceRange.max, updateParam])

  useEffect(() => {
    if (localMaxWeight === urlMaxWeight) return
    const t = setTimeout(() => updateParam('maxWeight', localMaxWeight >= sliderWeightMax ? '' : String(localMaxWeight)), 200)
    return () => clearTimeout(t)
  }, [localMaxWeight, urlMaxWeight, sliderWeightMax, updateParam])

  useEffect(() => {
    if (localMaxDrop === urlMaxDrop) return
    const t = setTimeout(() => updateParam('maxDrop', localMaxDrop >= dropRange.max ? '' : String(localMaxDrop)), 200)
    return () => clearTimeout(t)
  }, [localMaxDrop, urlMaxDrop, dropRange.max, updateParam])

  const currentSort = searchParams.get('sort') ?? 'name-asc'
  const [activeKey, activeDir] = parseSort(currentSort)

  return (
    <aside className={mobile ? 'w-full' : 'sticky top-20 h-[calc(100vh-5rem)] w-64 shrink-0 overflow-y-auto pr-3 scrollbar-hide'}>
      <div className="space-y-8 pb-8">
        {/* Sort */}
        <section>
          <h3 className="mb-3 text-sm font-display tracking-widest uppercase text-secondary">정렬</h3>
          <div className="grid grid-cols-2 gap-1.5">
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
                  className={`flex min-h-[44px] items-center justify-between rounded-lg border px-3 py-2 text-sm font-body transition-all ${
                    isActive
                      ? 'border-accent/40 bg-accent/8 text-accent shadow-glow-sm'
                      : 'border-border text-secondary hover:border-border-hover hover:text-primary'
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
          <h3 className="mb-3 text-sm font-display tracking-widest uppercase text-secondary">카테고리</h3>
          <div className="grid grid-cols-2 gap-1.5">
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
                  pushParams(params)
                }}
                className={`flex min-h-[44px] items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-body transition-all ${
                  category === c.id
                    ? 'border-accent/40 bg-accent/8 text-accent shadow-glow-sm'
                    : 'border-border text-secondary hover:border-border-hover hover:text-primary'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* Brands */}
        <section>
          <button
            onClick={() => setBrandsOpen(!brandsOpen)}
            aria-expanded={brandsOpen}
            className="mb-3 flex min-h-[44px] w-full items-center justify-between text-sm font-display uppercase tracking-widest text-secondary"
          >
            <span>
              브랜드{selectedBrands.length > 0 && (
                <span className="ml-1 text-accent normal-case font-body">({selectedBrands.length})</span>
              )}
            </span>
            <svg className={`h-4 w-4 transition-transform duration-200 ${brandsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {brandsOpen && (
            <div className={mobile ? 'grid grid-cols-2 gap-1.5' : 'space-y-1'}>
              {brands.map((brand) => (
                <label
                  key={brand.id}
                  className="group flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-elevated/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(brand.id)}
                    onChange={() => toggleBrand(brand.id)}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                      selectedBrands.includes(brand.id)
                        ? 'border-accent bg-accent'
                        : 'border-border group-hover:border-border-hover'
                    }`}
                  >
                    {selectedBrands.includes(brand.id) && (
                      <svg className="w-3 h-3 text-dark" fill="currentColor" viewBox="0 0 20 20">
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
            aria-expanded={rangeOpen}
            className="mb-3 flex min-h-[44px] w-full items-center justify-between text-sm font-display uppercase tracking-widest text-secondary"
          >
            <span>
              범위 필터{[searchParams.get('maxPrice'), searchParams.get('maxWeight'), searchParams.get('maxDrop')].filter(Boolean).length > 0 && (
                <span className="text-accent normal-case font-body ml-1">
                  ({[searchParams.get('maxPrice'), searchParams.get('maxWeight'), searchParams.get('maxDrop')].filter(Boolean).length}개 활성)
                </span>
              )}
            </span>
            <svg className={`h-4 w-4 transition-transform duration-200 ${rangeOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {rangeOpen && (
            <div className="space-y-5">
              {/* 최대 가격 */}
              <div>
                <div className="mb-1.5 flex justify-between text-sm font-body">
                  <span className="text-secondary">최대 가격(원)</span>
                  <span className="text-primary font-semibold">{formatPrice(localMaxPrice)}</span>
                </div>
                <input
                  type="range"
                  min={priceRange.min}
                  max={priceRange.max}
                  step={10000}
                  value={localMaxPrice}
                  aria-label="최대 가격"
                  aria-valuetext={`${formatPrice(localMaxPrice)}원`}
                  onChange={(e) => setLocalMaxPrice(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-muted text-xs font-body mt-1">
                  <span>{formatPrice(priceRange.min)}</span>
                  <span>{formatPrice(priceRange.max)}</span>
                </div>
              </div>
              {/* 최대 무게 */}
              <div>
                <div className="mb-1.5 flex justify-between text-sm font-body">
                  <span className="text-secondary">최대 무게(g)</span>
                  <span className="text-primary font-semibold">{localMaxWeight}</span>
                </div>
                <input
                  type="range"
                  min={sliderWeightMin}
                  max={sliderWeightMax}
                  step={10}
                  value={localMaxWeight}
                  aria-label="최대 무게"
                  aria-valuetext={`${localMaxWeight}g`}
                  onChange={(e) => setLocalMaxWeight(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-muted text-xs font-body mt-1">
                  <span>{sliderWeightMin}</span>
                  <span>{sliderWeightMax}</span>
                </div>
              </div>
              {/* 최대 드롭 */}
              <div>
                <div className="mb-1.5 flex justify-between text-sm font-body">
                  <span className="text-secondary">드롭(mm)</span>
                  <span className="text-primary font-semibold">{localMaxDrop}</span>
                </div>
                <input
                  type="range"
                  min={dropRange.min}
                  max={dropRange.max}
                  step={1}
                  value={localMaxDrop}
                  aria-label="최대 드롭"
                  aria-valuetext={`${localMaxDrop}mm`}
                  onChange={(e) => setLocalMaxDrop(Number(e.target.value))}
                  className="w-full"
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
            aria-expanded={specOpen}
            className="mb-3 flex min-h-[44px] w-full items-center justify-between text-sm font-display uppercase tracking-widest text-secondary"
          >
            <span>
              스펙 필터{activeSpecCount > 0 && (
                <span className="text-accent normal-case font-body ml-1">({activeSpecCount}개 활성)</span>
              )}
            </span>
            <svg className={`h-4 w-4 transition-transform duration-200 ${specOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {specOpen && (
            <div className="space-y-5">
              {SPEC_FILTERS.map((f) => {
                const val = Number(searchParams.get(f.param) ?? 1)
                return (
                  <div key={f.param}>
                    <div className="mb-1.5 flex items-center justify-between text-sm font-body">
                      <span className={f.textClass}>{f.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-primary font-semibold">{val}</span>
                        {val > 1 && (
                          <button
                            onClick={() => updateParam(f.param, '')}
                            aria-label={`${f.label} 필터 초기화`}
                            className="-my-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-sm text-muted transition-colors hover:bg-elevated/50 hover:text-primary"
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
                      aria-label={f.label}
                      aria-valuetext={`최소 ${val}점`}
                      onChange={(e) =>
                        updateParam(f.param, Number(e.target.value) > 1 ? e.target.value : '')
                      }
                      className="w-full slider-spec"
                      style={{ '--slider-color': `var(${f.colorVar})` } as React.CSSProperties}
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
