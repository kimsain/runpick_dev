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

export function getSimilarShoes(shoe: Shoe, limit = 3): Shoe[] {
  return getAllShoes()
    .filter(
      (s) =>
        s.slug !== shoe.slug &&
        s.categoryId === shoe.categoryId &&
        s.subcategoryId === shoe.subcategoryId
    )
    .slice(0, limit)
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
