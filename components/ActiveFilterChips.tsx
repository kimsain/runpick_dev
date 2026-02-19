'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

const CATEGORY_LABELS: Record<string, string> = {
  daily: '데일리',
  'super-trainer': '슈퍼트레이너',
  racing: '레이싱',
}

const SORT_LABELS: Record<string, string> = {
  'price-asc': '가격↑',
  'price-desc': '가격↓',
  'weight-asc': '무게↑',
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

  const maxPrice = searchParams.get('maxPrice')
  if (maxPrice) {
    chips.push({
      label: `최대 ₩${(Number(maxPrice) / 10000).toFixed(0)}만`,
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

  const sort = searchParams.get('sort')
  if (sort) {
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
