import type { Shoe, Brand, BrandData } from './types'

import adidasData from '../data/brands/adidas.json'
import asicsData from '../data/brands/asics.json'
import brooksData from '../data/brands/brooks.json'
import hokaData from '../data/brands/hoka.json'
import mizunoData from '../data/brands/mizuno.json'
import newBalanceData from '../data/brands/new-balance.json'
import nikeData from '../data/brands/nike.json'
import pumaData from '../data/brands/puma.json'
import sauconyData from '../data/brands/saucony.json'

const allBrandData: BrandData[] = [
  adidasData as BrandData,
  asicsData as BrandData,
  brooksData as BrandData,
  hokaData as BrandData,
  mizunoData as BrandData,
  newBalanceData as BrandData,
  nikeData as BrandData,
  pumaData as BrandData,
  sauconyData as BrandData,
]

let _shoes: Shoe[] | null = null
let _brands: Brand[] | null = null

export function getAllShoes(): Shoe[] {
  if (_shoes) return _shoes
  _shoes = allBrandData.flatMap((bd) => bd.shoes as Shoe[])
  return _shoes
}

export function getBrands(): Brand[] {
  if (_brands) return _brands
  _brands = allBrandData.map((bd) => bd.brand)
  return _brands
}

export function getShoeBySlug(slug: string): Shoe | undefined {
  return getAllShoes().find((s) => s.slug === slug)
}

export function getShoesByCategory(cat: string): Shoe[] {
  if (!cat || cat === 'all') return getAllShoes()
  return getAllShoes().filter((s) => s.categoryId === cat)
}

// ── Similarity scoring ──────────────────────────────────────────────────────
// Converts a shoe's specs to a normalized vector (all dims ~0-10 scale).
// Uses raw* scores when available for greater precision.
function specVec(shoe: Shoe): number[] {
  const { specs } = shoe
  return [
    specs.rawCushioning     ?? specs.cushioning,        // ~1-10+
    specs.rawResponsiveness ?? specs.responsiveness,    // ~1-10+
    specs.rawStability      ?? specs.stability,         // ~1-10+
    specs.rawDurability     ?? specs.durability,        // ~1-10+
    specs.weightScore       ?? 5,                       // 0-10
    (specs.drop / 12) * 10,                             // 0-12mm → 0-10
    Math.max(0, Math.min(10, (specs.stackHeight.heel - 20) / 25 * 10)), // 20-45mm → 0-10
  ]
}

// Weights: [cushioning, responsiveness, stability, durability, weightScore, drop, stackHeel]
const SPEC_WEIGHTS = [2.0, 2.0, 1.5, 1.0, 1.5, 2.0, 1.0]

function specsDistance(a: Shoe, b: Shoe): number {
  const va = specVec(a)
  const vb = specVec(b)
  let sumSq = 0
  for (let i = 0; i < va.length; i++) {
    const diff = va[i] - vb[i]
    sumSq += SPEC_WEIGHTS[i] * diff * diff
  }
  // Prefer same category, then same subcategory
  const catPenalty = a.categoryId !== b.categoryId ? 3.0
    : a.subcategoryId !== b.subcategoryId ? 1.0
    : 0
  return Math.sqrt(sumSq) + catPenalty
}

export function getSimilarShoes(shoe: Shoe, limit = 3): Shoe[] {
  return getAllShoes()
    .filter((s) => s.slug !== shoe.slug)
    .map((s) => ({ candidate: s, dist: specsDistance(shoe, s) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((entry) => entry.candidate)
}

export function getAllSlugs(): string[] {
  return getAllShoes().map((s) => s.slug)
}

export function getPriceRange(): { min: number; max: number } {
  const prices = getAllShoes().map((s) => s.price)
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export function getWeightRange(): { min: number; max: number } {
  const weights = getAllShoes().map((s) => s.specs.weight)
  return { min: Math.min(...weights), max: Math.max(...weights) }
}

export function getDropRange(): { min: number; max: number } {
  const drops = getAllShoes().map((s) => s.specs.drop)
  return { min: Math.min(...drops), max: Math.max(...drops) }
}
