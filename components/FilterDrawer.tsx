'use client'

import { useState, useEffect, useRef, type HTMLAttributes } from 'react'
import FilterPanel from './FilterPanel'
import type { Brand } from '@/lib/types'
import { useFocusTrap } from '@/lib/useFocusTrap'
import Eyebrow from '@/components/ui/Eyebrow'

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
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 shadow-ring hover:shadow-card text-tertiary hover:text-primary transition-shadow duration-200 ease-out-quart"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18M7 12h10M11 20h2" />
        </svg>
        <Eyebrow as="span">필터</Eyebrow>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-dark/70 backdrop-blur-md"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal={true}
        aria-hidden={!open}
        aria-label="필터"
        {...inactiveDrawerProps}
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface shadow-modal transition-transform duration-400 ease-out-expo ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1.5 w-12 rounded-full bg-border-hover" />
        </div>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex flex-col gap-1">
            <Eyebrow>FILTER</Eyebrow>
            <span className="font-display text-md text-primary tracking-tight-2">필터</span>
          </div>
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
            className="w-full min-h-[52px] rounded-xl bg-accent py-3.5 text-lg font-display text-dark shadow-feature transition-colors hover:bg-accent-dim"
          >
            <span className="font-mono tabular-nums">{totalCount}</span>개 결과 보기
          </button>
        </div>
      </div>
    </>
  )
}
