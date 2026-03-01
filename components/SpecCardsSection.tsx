'use client'

import { useState, useEffect, useRef } from 'react'
import type { SpecItem } from '@/app/methodology/data/specItems'

interface Props {
  items: SpecItem[]
}

type Tab = 'general' | 'expert'

export default function SpecCardsSection({ items }: Props) {
  const [selected, setSelected] = useState<SpecItem | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  function openModal(spec: SpecItem) {
    setSelected(spec)
    setActiveTab('general')
  }

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
            key={spec.id}
            onClick={() => openModal(spec)}
            className="bg-card border border-elevated p-6 text-left hover:ring-1 hover:ring-accent/50 transition-shadow cursor-pointer"
          >
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-display text-xl" style={{ color: spec.color }}>
                {spec.name}
              </span>
              <span className="text-sm font-body text-muted">{spec.nameEn}</span>
            </div>
            <p className="text-secondary text-sm font-body mb-3">{spec.summary}</p>
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
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />

          {/* Modal panel */}
          <div className="relative bg-card border border-elevated w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header — 고정 */}
            <div className="flex items-baseline justify-between px-6 pt-6 pb-4 border-b border-elevated shrink-0">
              <div className="flex items-baseline gap-2">
                <span
                  id="spec-modal-title"
                  className="font-display text-xl"
                  style={{ color: selected.color }}
                >
                  {selected.name}
                </span>
                <span className="text-sm font-body text-muted">{selected.nameEn}</span>
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

            {/* Tabs — 고정 */}
            <div className="flex border-b border-elevated shrink-0">
              {(
                [
                  { key: 'general', label: '쉬운 설명' },
                  { key: 'expert', label: '기술 노트' },
                ] as { key: Tab; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-6 py-3 text-sm font-body transition-colors border-b-2 -mb-px ${
                    activeTab === key
                      ? 'text-primary border-accent'
                      : 'text-muted border-transparent hover:text-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Body — 스크롤 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'general' && (
                <>
                  <p className="text-secondary text-sm font-body leading-relaxed">
                    {selected.modalContent.general.description}
                  </p>
                  {selected.modalContent.general.impact && (
                    <div className="bg-surface border border-elevated p-4">
                      <p className="text-xs font-body text-accent tracking-widest uppercase mb-2">
                        점수별 체감
                      </p>
                      <p className="text-secondary text-sm font-body leading-relaxed">
                        {selected.modalContent.general.impact}
                      </p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'expert' && (
                <>
                  <div>
                    <p className="text-xs font-body text-accent tracking-widest uppercase mb-2">
                      데이터 소스
                    </p>
                    <p className="text-secondary text-sm font-body leading-relaxed">
                      {selected.modalContent.expert.dataSource}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-body text-accent tracking-widest uppercase mb-2">
                      공식
                    </p>
                    <pre className="bg-surface border border-elevated text-secondary text-xs font-mono p-4 overflow-x-auto whitespace-pre leading-relaxed">
                      {selected.modalContent.expert.formula}
                    </pre>
                  </div>

                  <div>
                    <p className="text-xs font-body text-accent tracking-widest uppercase mb-2">
                      설계 근거
                    </p>
                    <p className="text-secondary text-sm font-body leading-relaxed">
                      {selected.modalContent.expert.rationale}
                    </p>
                  </div>

                  {selected.modalContent.expert.constants &&
                    selected.modalContent.expert.constants.length > 0 && (
                      <div>
                        <p className="text-xs font-body text-accent tracking-widest uppercase mb-3">
                          주요 상수
                        </p>
                        <div className="border border-elevated divide-y divide-elevated">
                          {selected.modalContent.expert.constants.map((c) => (
                            <div key={c.name} className="px-4 py-3 flex flex-col gap-1">
                              <div className="flex items-baseline gap-3">
                                <span className="text-xs font-mono text-accent shrink-0">
                                  {c.name}
                                </span>
                                <span className="text-xs font-mono text-primary">{c.value}</span>
                              </div>
                              <p className="text-xs font-body text-muted">{c.meaning}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
