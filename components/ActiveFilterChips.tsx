'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { CATEGORY_LABELS, SPEC_LABELS } from '@/lib/constants'

const SORT_LABELS: Record<string, string> = {
  'name-asc': '이름↑', 'name-desc': '이름↓',
  'value-desc': '가성비↓', 'value-asc': '가성비↑',
  'cushioning-desc': '쿠션성↓', 'cushioning-asc': '쿠션성↑',
  'responsiveness-desc': '반응성↓', 'responsiveness-asc': '반응성↑',
  'stability-desc': '안정성↓', 'stability-asc': '안정성↑',
  'durability-desc': '내구성↓', 'durability-asc': '내구성↑',
  'weight-asc': '무게↑', 'weight-desc': '무게↓',
  'price-asc': '가격↑', 'price-desc': '가격↓',
}

const SPEC_CHIP_LABELS: Record<string, string> = {
  minCush: SPEC_LABELS.cushioning,
  minResp: SPEC_LABELS.responsiveness,
  minStab: SPEC_LABELS.stability,
  minDur:  SPEC_LABELS.durability,
  minWS:   SPEC_LABELS.weightScore,
  minVS:   SPEC_LABELS.valueScore,
}

export default function ActiveFilterChips() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const removeParam = useCallback(
    (key: string, value?: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (key === 'brands' && value) {
        const current = params.get('brands')?.split(',').filter(Boolean) ?? []
        const next = current.filter((b) => b !== value)
        if (next.length) {
          params.set('brands', next.join(','))
        } else {
          params.delete('brands')
        }
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const chips: { label: string; onRemove: () => void }[] = []

  const brands = searchParams.get('brands')?.split(',').filter(Boolean) ?? []
  brands.forEach((b) =>
    chips.push({ label: `브랜드: ${b.toUpperCase()}`, onRemove: () => removeParam('brands', b) })
  )

  const query = searchParams.get('q')
  if (query) {
    chips.push({
      label: `검색: ${query}`,
      onRemove: () => removeParam('q'),
    })
  }

  const category = searchParams.get('category')
  if (category) {
    chips.push({
      label: CATEGORY_LABELS[category] ?? category,
      onRemove: () => removeParam('category'),
    })
  }

  const maxPrice = searchParams.get('maxPrice')
  if (maxPrice) {
    chips.push({
      label: `최대 ${Math.round(Number(maxPrice) / 10000)}만`,
      onRemove: () => removeParam('maxPrice'),
    })
  }

  const maxWeight = searchParams.get('maxWeight')
  if (maxWeight) {
    chips.push({
      label: `최대 ${maxWeight}g`,
      onRemove: () => removeParam('maxWeight'),
    })
  }

  const maxDrop = searchParams.get('maxDrop')
  if (maxDrop) {
    chips.push({
      label: `최대 ${maxDrop}mm 드롭`,
      onRemove: () => removeParam('maxDrop'),
    })
  }

  for (const [param, label] of Object.entries(SPEC_CHIP_LABELS)) {
    const val = searchParams.get(param)
    if (val) {
      chips.push({
        label: `${label} ${val}+`,
        onRemove: () => removeParam(param),
      })
    }
  }

  const sort = searchParams.get('sort')
  if (sort && sort !== 'name-asc') {
    chips.push({
      label: SORT_LABELS[sort] ?? sort,
      onRemove: () => removeParam('sort'),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={chip.onRemove}
          className="flex min-h-[44px] items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-3 py-2 text-sm font-body text-accent transition-all hover:bg-accent hover:text-dark"
        >
          {chip.label}
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}
      <button
        onClick={() => router.push(pathname)}
        className="min-h-[44px] rounded-full border border-border px-3 py-2 text-sm font-body text-secondary transition-colors hover:border-border-hover hover:text-primary"
      >
        전체 초기화
      </button>
    </div>
  )
}
