'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const CATEGORY_LABELS: Record<string, string> = {
  daily: '데일리',
  'super-trainer': '슈퍼트레이너',
  racing: '레이싱',
}

const SUBCATEGORY_LABELS: Record<string, string> = {
  entry: '입문',
  'max-cushion': '맥스쿠션',
  'all-rounder': '올라운드',
  stability: '안정화',
  lightweight: '경량',
  'no-plate': '플레이트리스',
  'light-plate': '라이트 플레이트',
  'carbon-plate': '카본 플레이트',
  half: '하프',
  full: '풀',
}

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
  minCush: '쿠션성',
  minResp: '반응성',
  minStab: '안정성',
  minDur: '내구성',
  minWS: '경량성',
  minVS: '가성비',
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

  const category = searchParams.get('category')
  if (category) {
    chips.push({
      label: CATEGORY_LABELS[category] ?? category,
      onRemove: () => removeParam('category'),
    })
  }

  const subcategory = searchParams.get('subcategory')
  if (subcategory) {
    chips.push({
      label: SUBCATEGORY_LABELS[subcategory] ?? subcategory,
      onRemove: () => removeParam('subcategory'),
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
          className="flex items-center gap-2 text-sm font-body px-3 py-2 bg-elevated border border-accent/30 text-accent hover:bg-accent hover:text-base transition-colors min-h-[44px]"
        >
          {chip.label}
          <span className="text-base leading-none">×</span>
        </button>
      ))}
      <button
        onClick={() => router.push(pathname)}
        className="text-sm font-body text-muted hover:text-secondary transition-colors min-h-[44px] px-2"
      >
        전체 초기화
      </button>
    </div>
  )
}
