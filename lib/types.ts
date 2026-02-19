export interface StackHeight {
  heel: number
  forefoot: number
}

export interface Specs {
  weight: number
  drop: number
  cushioning: number
  responsiveness: number
  stability: number
  durability: number
  stackHeight: StackHeight
  weightScore?: number   // 0-10, 가벼울수록 높음
  valueScore?: number    // 0-10, (쿠션+반응+안정+내구)÷가격 정규화
}

export interface Shoe {
  id: string
  brandId: string
  name: string
  nameKo: string
  categoryId: 'daily' | 'super-trainer' | 'racing'
  subcategoryId: string
  price: number
  priceFormatted: string
  description: string
  shortDescription: string
  imageUrl: string
  specs: Specs
  pros: string[]
  cons: string[]
  bestFor: string[]
  technologies: string[]
  releaseYear: number
  colorways: string[]
  slug: string
  officialUrl: string
  confidence?: 'very-high' | 'high' | 'medium' | 'low'
}

export interface Brand {
  id: string
  name: string
  nameKo: string
  logo: string
  color: string
  description: string
}

export interface BrandData {
  brand: Brand
  shoes: Shoe[]
}

export type SortOption = 'recommended' | 'price-asc' | 'price-desc' | 'weight-asc'

export interface FilterState {
  brands: string[]
  category: string
  minPrice: number
  maxPrice: number
  minWeight: number
  maxWeight: number
  minDrop: number
  maxDrop: number
  sort: SortOption
}
