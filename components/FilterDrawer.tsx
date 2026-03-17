'use client'

import { useState, useEffect, useRef, type HTMLAttributes } from 'react'
import FilterPanel from './FilterPanel'
import type { Brand } from '@/lib/types'
import { useFocusTrap } from '@/lib/useFocusTrap'

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
  const drawerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  useFocusTrap(drawerRef, open)

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus()
    }
    wasOpenRef.current = open
  }, [open])

  const inactiveDrawerProps = !open
    ? ({ inert: '' } as unknown as HTMLAttributes<HTMLDivElement>)
    : undefined

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-body text-secondary transition-all hover:border-border-hover hover:text-primary"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18M7 12h10M11 20h2" />
        </svg>
        필터
      </button>

      {/* Backdrop */}
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-dark/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-hidden={!open}
        aria-label="필터"
        {...inactiveDrawerProps}
        className={`fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="font-display text-md text-primary">필터</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="필터 닫기"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-secondary transition-colors hover:bg-elevated/50 hover:text-primary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">
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
        <div className="px-5 pb-6" style={{ paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))` }}>
          <button
            onClick={() => setOpen(false)}
            className="w-full min-h-[52px] rounded-xl bg-accent py-3.5 text-lg font-display text-dark shadow-glow-sm transition-colors hover:bg-accent-dim"
          >
            {totalCount}개 결과 보기
          </button>
        </div>
      </div>
    </>
  )
}
