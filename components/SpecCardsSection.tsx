'use client'

import { useState, useEffect, useRef } from 'react'
import type { SpecItem } from '@/app/methodology/data/specItems'
import ScoreMethodNotice from '@/components/ScoreMethodNotice'

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
            className="group cursor-pointer rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-accent/30 hover:shadow-glow-sm"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className="font-display text-lg sm:text-xl break-keep"
                style={{ color: spec.color }}
              >
                {spec.name}
              </span>
              <span className="text-sm font-body text-muted">{spec.nameEn}</span>
              {spec.badgeLabel && (
                <span className="inline-flex items-center rounded-full border border-spec-stability/25 bg-spec-stability/10 px-2 py-1 text-xs font-body text-spec-stability">
                  {spec.badgeLabel}
                </span>
              )}
            </div>
            <p className="mb-3 text-sm font-body leading-relaxed text-secondary">{spec.summary}</p>
            <p className="text-xs font-body text-muted">{spec.basis}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-body text-muted transition-colors group-hover:text-accent">
              자세히 보기
              <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
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
          <div className="absolute inset-0 bg-dark/80 backdrop-blur-sm" onClick={() => setSelected(null)} />

          {/* Modal panel */}
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            {/* Header — 고정 */}
            <div className="flex items-baseline justify-between border-b border-border px-6 pb-4 pt-6 shrink-0">
              <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                <span
                  id="spec-modal-title"
                  className="font-display text-lg sm:text-xl break-keep"
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
                className="ml-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted transition-colors hover:bg-elevated/50 hover:text-primary"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs — 고정 */}
            <div className="flex border-b border-border shrink-0">
              {(
                [
                  { key: 'general', label: '쉬운 설명' },
                  { key: 'expert', label: '기술 노트' },
                ] as { key: Tab; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`-mb-px border-b-2 px-6 py-3 text-sm font-body transition-colors ${
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
              {selected.notice && <ScoreMethodNotice notice={selected.notice} />}

              {activeTab === 'general' && (
                <>
                  <p className="text-secondary text-sm font-body leading-relaxed">
                    {selected.modalContent.general.description}
                  </p>
                  {selected.modalContent.general.impact && (
                    <div className="rounded-xl border border-border bg-surface p-5">
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
                    <pre className="overflow-x-auto whitespace-pre rounded-xl border border-border bg-surface p-5 text-xs font-mono leading-relaxed text-secondary">
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
                        <div className="overflow-hidden rounded-xl border border-border divide-y divide-border">
                          {selected.modalContent.expert.constants.map((c) => (
                            <div key={c.name} className="flex flex-col gap-1 px-5 py-3">
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
