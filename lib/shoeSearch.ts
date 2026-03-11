import type { Brand, Shoe } from './types'

export const RECENT_SEARCHES_KEY = 'runpick.recent-searches'
export const MAX_RECENT_SEARCHES = 3
export const MAX_SEARCH_SUGGESTIONS = 6

export interface ShoeSearchRank {
  primaryScore: number
  directScore: number
  brandScore: number
  totalScore: number
}

export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/[\s-]+/g, '')
}

function getMatchScore(query: string, queryCompact: string, candidate: string): number {
  if (!candidate) return 0

  const normalizedCandidate = normalizeSearchText(candidate)
  const compactCandidate = compactSearchText(candidate)

  if (!normalizedCandidate && !compactCandidate) {
    return 0
  }

  if (
    normalizedCandidate === query ||
    compactCandidate === queryCompact
  ) {
    return 3
  }

  if (
    normalizedCandidate.startsWith(query) ||
    compactCandidate.startsWith(queryCompact)
  ) {
    return 2
  }

  if (
    normalizedCandidate.includes(query) ||
    compactCandidate.includes(queryCompact)
  ) {
    return 1
  }

  return 0
}

export function getShoeSearchRank(
  shoe: Shoe,
  brand: Brand | undefined,
  query: string
): ShoeSearchRank | null {
  const normalizedQuery = normalizeSearchText(query)
  const compactQuery = compactSearchText(query)

  if (!normalizedQuery || !compactQuery) {
    return null
  }

  const directScore = Math.max(
    getMatchScore(normalizedQuery, compactQuery, shoe.name),
    getMatchScore(normalizedQuery, compactQuery, shoe.nameKo),
    getMatchScore(normalizedQuery, compactQuery, shoe.slug)
  )

  const brandScore = Math.max(
    getMatchScore(normalizedQuery, compactQuery, brand?.name ?? ''),
    getMatchScore(normalizedQuery, compactQuery, brand?.nameKo ?? ''),
    getMatchScore(normalizedQuery, compactQuery, brand?.id ?? '')
  )

  const primaryScore = Math.max(directScore, brandScore)
  if (primaryScore === 0) {
    return null
  }

  return {
    primaryScore,
    directScore,
    brandScore,
    totalScore: primaryScore * 100 + directScore * 10 + brandScore,
  }
}

export function loadRecentSearches(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT_SEARCHES)
  } catch {
    return []
  }
}

export function persistRecentSearch(term: string): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  const trimmed = term.trim()
  if (!trimmed) {
    return loadRecentSearches()
  }

  const normalizedTerm = compactSearchText(trimmed)
  const next = [
    trimmed,
    ...loadRecentSearches().filter((entry) => compactSearchText(entry) !== normalizedTerm),
  ].slice(0, MAX_RECENT_SEARCHES)

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next))
  return next
}

