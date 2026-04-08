'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Brand, Shoe } from '@/lib/types'
import Eyebrow from '@/components/ui/Eyebrow'
import {
  MAX_SEARCH_SUGGESTIONS,
  getShoeSearchRank,
  loadRecentSearches,
  normalizeSearchText,
  persistRecentSearch,
} from '@/lib/shoeSearch'

interface Props {
  shoes: Shoe[]
  brands: Brand[]
}

type SuggestionItem =
  | {
      type: 'recent'
      label: string
    }
  | {
      type: 'shoe'
      label: string
      secondaryLabel: string
      queryText: string
      slug: string
    }

function hasHangul(value: string): boolean {
  return /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(value)
}

export default function ShoesSearchBar({ shoes, brands }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const inputId = useId()
  const listboxId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputValueRef = useRef('')
  const isComposingRef = useRef(false)

  const urlQuery = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(urlQuery)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const deferredInputValue = useDeferredValue(inputValue)

  const brandMap = useMemo(
    () => new Map(brands.map((brand) => [brand.id, brand])),
    [brands]
  )

  const replaceQuery = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      const params = new URLSearchParams(searchParams.toString())

      if (trimmed) {
        params.set('q', trimmed)
      } else {
        params.delete('q')
      }

      const queryString = params.toString()
      const href = queryString ? `${pathname}?${queryString}` : pathname
      router.replace(href, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const commitSearch = useCallback(
    (value: string, shouldSaveRecent: boolean) => {
      const trimmed = value.trim()

      setInputValue(trimmed)
      replaceQuery(trimmed)

      if (shouldSaveRecent && trimmed) {
        setRecentSearches(persistRecentSearch(trimmed))
      }

      setIsOpen(false)
      setActiveIndex(-1)
    },
    [replaceQuery]
  )

  const suggestionItems = useMemo(() => {
    const normalizedQuery = normalizeSearchText(deferredInputValue)
    if (!normalizedQuery) {
      return recentSearches.slice(0, 3).map<SuggestionItem>((label) => ({
        type: 'recent',
        label,
      }))
    }

    return shoes
      .map((shoe, index) => {
        const brand = brandMap.get(shoe.brandId)
        const rank = getShoeSearchRank(shoe, brand, normalizedQuery)
        if (!rank) {
          return null
        }

        const queryText = hasHangul(deferredInputValue) && shoe.nameKo
          ? shoe.nameKo
          : shoe.name

        return {
          type: 'shoe' as const,
          label: shoe.name,
          secondaryLabel: `${brand?.name ?? shoe.brandId} · ${shoe.nameKo}`,
          queryText,
          slug: shoe.slug,
          index,
          rank,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        const scoreDiff = b.rank.totalScore - a.rank.totalScore
        if (scoreDiff !== 0) return scoreDiff
        return a.index - b.index
      })
      .slice(0, MAX_SEARCH_SUGGESTIONS)
      .map<SuggestionItem>(({ label, secondaryLabel, queryText, slug }) => ({
        type: 'shoe',
        label,
        secondaryLabel,
        queryText,
        slug,
      }))
  }, [brandMap, deferredInputValue, recentSearches, shoes])

  const hasSearchInput = normalizeSearchText(inputValue).length > 0
  const showPanel = isOpen && (!hasSearchInput ? suggestionItems.length > 0 : true)
  const showEmptyState = showPanel && hasSearchInput && suggestionItems.length === 0

  useEffect(() => {
    inputValueRef.current = inputValue
  }, [inputValue])

  useEffect(() => {
    setRecentSearches(loadRecentSearches())
  }, [])

  useEffect(() => {
    const normalizedInput = normalizeSearchText(inputValueRef.current)
    const normalizedUrl = normalizeSearchText(urlQuery)

    if (isComposingRef.current) {
      return
    }

    if (normalizedInput === normalizedUrl) {
      return
    }

    if (inputRef.current === document.activeElement) {
      return
    }

    setInputValue(urlQuery)
  }, [urlQuery])

  useEffect(() => {
    if (!showPanel) {
      setActiveIndex(-1)
    }
  }, [showPanel])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [])

  useEffect(() => {
    const normalizedInput = normalizeSearchText(inputValue)
    const normalizedUrl = normalizeSearchText(urlQuery)

    if (isComposingRef.current) {
      return
    }

    if (normalizedInput === normalizedUrl) {
      return
    }

    const timer = window.setTimeout(() => {
      replaceQuery(inputValue)
    }, 180)

    return () => window.clearTimeout(timer)
  }, [inputValue, replaceQuery, urlQuery])

  const handleSuggestionSelect = useCallback(
    (item: SuggestionItem) => {
      if (item.type === 'recent') {
        commitSearch(item.label, true)
        return
      }

      commitSearch(item.queryText, true)
    },
    [commitSearch]
  )

  return (
    <div ref={wrapperRef} className="relative mb-6 md:mb-8">
      <div className="mx-auto max-w-3xl">
        <label htmlFor={inputId} className="sr-only">
          러닝화 검색
        </label>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (isComposingRef.current) {
              return
            }
            commitSearch(inputValue, true)
          }}
          className={`relative flex min-h-[56px] items-center gap-3 rounded-full bg-card/80 px-4 py-2.5 backdrop-blur-md transition-shadow duration-250 ease-out-quart ${
            showPanel
              ? 'shadow-feature'
              : 'shadow-card hover:shadow-card-hover focus-within:shadow-feature'
          }`}
          role="search"
        >
          <svg
            className="h-5 w-5 shrink-0 text-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.7}
              d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            id={inputId}
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="브랜드나 러닝화를 검색해보세요"
            value={inputValue}
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setInputValue(event.target.value)
              setIsOpen(true)
            }}
            onCompositionStart={() => {
              isComposingRef.current = true
            }}
            onCompositionEnd={(event) => {
              isComposingRef.current = false
              setInputValue(event.currentTarget.value)
              setIsOpen(true)
              replaceQuery(event.currentTarget.value)
            }}
            onKeyDown={(event) => {
              if (isComposingRef.current || event.nativeEvent.isComposing) {
                return
              }

              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setIsOpen(true)
                if (suggestionItems.length > 0) {
                  setActiveIndex((prev) => (prev + 1) % suggestionItems.length)
                }
              }

              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setIsOpen(true)
                if (suggestionItems.length > 0) {
                  setActiveIndex((prev) => (prev <= 0 ? suggestionItems.length - 1 : prev - 1))
                }
              }

              if (event.key === 'Escape') {
                event.preventDefault()
                setIsOpen(false)
                setActiveIndex(-1)
              }

              if (event.key === 'Enter' && activeIndex >= 0 && suggestionItems[activeIndex]) {
                event.preventDefault()
                handleSuggestionSelect(suggestionItems[activeIndex])
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-primary outline-none placeholder:text-muted md:text-base"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showPanel}
            aria-controls={showPanel ? listboxId : undefined}
            aria-activedescendant={
              activeIndex >= 0 && suggestionItems[activeIndex]
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
          />

          {hasSearchInput && (
            <button
              type="button"
              onClick={() => {
                setInputValue('')
                replaceQuery('')
                setIsOpen(true)
                setActiveIndex(-1)
                inputRef.current?.focus()
              }}
              aria-label="검색어 지우기"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-secondary transition-colors hover:text-primary"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          )}

          <kbd className="hidden md:inline-flex items-center gap-1 rounded shadow-ring font-mono text-eyebrow text-tertiary px-2 py-1">
            ↵
          </kbd>
        </form>
      </div>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-20 mt-3">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-card/95 backdrop-blur-md shadow-modal">
            <div className="border-b border-border">
              <Eyebrow className="px-5 py-3">{hasSearchInput ? '추천 검색어' : '최근 검색어'}</Eyebrow>
            </div>

            {showEmptyState ? (
              <div className="px-5 py-6" role="status" aria-live="polite">
                <p className="font-body text-sm text-secondary">
                  일치하는 러닝화가 없습니다. Enter로 현재 검색어를 그대로 적용할 수 있습니다.
                </p>
              </div>
            ) : (
              <ul id={listboxId} role="listbox" className="py-2">
                {suggestionItems.map((item, index) => {
                  const isActive = index === activeIndex

                  return (
                    <li key={item.type === 'recent' ? item.label : item.slug} role="presentation">
                      <button
                        id={`${listboxId}-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => handleSuggestionSelect(item)}
                        className={`relative flex w-full items-center gap-3 px-5 py-3 text-left transition-colors ${
                          isActive ? 'bg-elevated/60' : 'hover:bg-elevated/40'
                        }`}
                      >
                        {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-accent" />}
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                            item.type === 'recent'
                              ? 'border-elevated text-secondary'
                              : 'border-accent/30 text-accent'
                          }`}
                          aria-hidden="true"
                        >
                          {item.type === 'recent' ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          )}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-body text-sm font-medium tracking-tight-1 text-primary">
                            {item.label}
                          </span>
                          {item.type === 'shoe' ? (
                            <span className="block truncate pt-0.5 text-sm text-secondary">
                              {item.secondaryLabel}
                            </span>
                          ) : (
                            <span className="block truncate pt-0.5 text-sm text-secondary">
                              다시 검색
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
