'use client'

import { useState, useEffect, useRef } from 'react'

interface ModalContent {
  dataSource: string
  formula: string
  rationale: string
}

export interface SpecItem {
  name: string
  nameEn: string
  color: string
  description: string
  basis: string
  modalContent: ModalContent
}

interface Props {
  items: SpecItem[]
}

export default function SpecCardsSection({ items }: Props) {
  const [selected, setSelected] = useState<SpecItem | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!selected) return

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', handleKeyDown)

    closeButtonRef.current?.focus()

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [selected])

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((spec) => (
          <button
            key={spec.nameEn}
            onClick={() => setSelected(spec)}
            className="bg-card border border-elevated p-6 text-left hover:ring-1 hover:ring-accent/50 transition-shadow cursor-pointer"
          >
            <div className="flex items-baseline gap-2 mb-3">
              <span
                className="font-display text-xl"
                style={{ color: spec.color }}
              >
                {spec.name}
              </span>
              <span className="text-sm font-body text-muted">{spec.nameEn}</span>
            </div>
            <p className="text-secondary text-sm font-body mb-3">
              {spec.description}
            </p>
            <p className="text-xs font-body text-muted">{spec.basis}</p>
          </button>
        ))}
      </div>

      {selected !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spec-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSelected(null)}
          />

          {/* Modal panel */}
          <div className="relative bg-card border border-elevated w-full max-w-lg max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-baseline justify-between p-6 pb-4 border-b border-elevated">
              <div className="flex items-baseline gap-2">
                <span
                  id="spec-modal-title"
                  className="font-display text-xl"
                  style={{ color: selected.color }}
                >
                  {selected.name}
                </span>
                <span className="text-sm font-body text-muted">
                  {selected.nameEn}
                </span>
              </div>
              <button
                ref={closeButtonRef}
                onClick={() => setSelected(null)}
                aria-label="모달 닫기"
                className="text-muted hover:text-primary transition-colors ml-4 text-xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Data source */}
              <div>
                <p className="text-xs font-body text-accent tracking-widest uppercase mb-2">
                  데이터 소스
                </p>
                <p className="text-secondary text-sm font-body">
                  {selected.modalContent.dataSource}
                </p>
              </div>

              {/* Formula */}
              <div>
                <p className="text-xs font-body text-accent tracking-widest uppercase mb-2">
                  공식
                </p>
                <pre className="bg-surface border border-elevated text-secondary text-xs font-mono p-4 overflow-x-auto whitespace-pre">
                  {selected.modalContent.formula}
                </pre>
              </div>

              {/* Rationale */}
              <div>
                <p className="text-xs font-body text-accent tracking-widest uppercase mb-2">
                  설계 근거
                </p>
                <p className="text-secondary text-sm font-body">
                  {selected.modalContent.rationale}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
