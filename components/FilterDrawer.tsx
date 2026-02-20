'use client'

import { useState } from 'react'
import FilterPanel from './FilterPanel'
import type { Brand } from '@/lib/types'

interface Props {
  brands: Brand[]
  priceRange: { min: number; max: number }
  weightRange: { min: number; max: number }
  dropRange: { min: number; max: number }
  totalCount: number
}

export default function FilterDrawer({
  brands,
  priceRange,
  weightRange,
  dropRange,
  totalCount,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-body border border-elevated px-4 py-3 text-secondary hover:text-primary hover:border-secondary transition-colors min-h-[44px]"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18M7 12h10M11 20h2" />
        </svg>
        필터
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-base/80 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-elevated max-h-[85vh] overflow-y-auto transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-elevated">
          <span className="font-display text-md text-primary">필터</span>
          <button
            onClick={() => setOpen(false)}
            className="text-secondary hover:text-primary transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          {/* Override sticky behavior inside drawer */}
          <div className="w-full">
            <FilterPanel
              brands={brands}
              priceRange={priceRange}
              weightRange={weightRange}
              dropRange={dropRange}
              mobile
            />
          </div>
        </div>
        <div className="px-4 pb-6">
          <button
            onClick={() => setOpen(false)}
            className="w-full bg-accent text-base font-display text-lg py-3 hover:bg-accent/90 transition-colors min-h-[44px]"
          >
            {totalCount}개 결과 보기
          </button>
        </div>
      </div>
    </>
  )
}
