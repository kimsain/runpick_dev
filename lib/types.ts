export interface StackHeight {
  heel: number
  forefoot: number
}

export interface QualitativeSignalDebug {
  sourceCount: number
  shares: Record<string, number>
}

export interface StabilityComponents {
  scoreVersion: string
  structureScore?: number | null
  platformScore?: number | null
  platformInputs?: Record<string, number | null>
  coreScore?: number | null
  subcategoryDelta?: number
  swayPenalty?: number
  qualitativeModifier?: number
  intermediateRaw?: number
  stackInput?: {
    source: string
    heel?: number | null
    forefoot?: number | null
  }
  softnessInput?: Record<string, string | number | null | undefined>
  qualitativeSignals?: QualitativeSignalDebug
}

export interface DurabilityComponents {
  scoreVersion: string
  outsoleScore?: number | null
  upperScore?: number | null
  midsoleLongevityScore?: number | null
  coreScore?: number | null
  compoundModifier?: number
  qualitativeModifier?: number
  intermediateRaw?: number
  inputs?: Record<string, number | null>
  qualitativeSignals?: QualitativeSignalDebug
}

export interface Specs {
  weight: number
  drop: number
  cushioning: number
  responsiveness: number
  stability: number
  durability: number
  stackHeight: StackHeight
  weightScore?: number        // 0-10, 가벼울수록 높음
  valueScore?: number         // 0-10, (쿠션성+반응성+안정성+내구성)÷가격 정규화
  rawCushioning?: number      // ≥1 소수점, 정렬 전용 (상한 없음), RunRepeat SA 기반 (RTINGS fallback)
  rawResponsiveness?: number  // ≥1 소수점, 정렬 전용 (상한 없음), RunRepeat ER% 기반 (RTINGS fallback)
  rawStability?: number       // ≥1 소수점, 정렬 전용 (상한 없음), RunRepeat 기반 (Case B)
  rawDurability?: number      // ≥1 소수점, 정렬 전용 (상한 없음), RunRepeat 기반 (Case B)
  rawValueScore?: number      // ≥1 소수점, 정렬 전용 (상한 없음), 혼합 raw 입력 가성비
  rawLightness?: number       // ≥1 소수점, 정렬 전용 (상한 없음), 무게 기반
  stabilityComponents?: StabilityComponents
  durabilityComponents?: DurabilityComponents
}

export interface ReviewSources {
  runrepeat?: string           // RunRepeat
  rtings?: string              // RTINGS
  dor?: string                 // Doctors of Running
  rtr?: string                 // Road Trail Run
  bitr?: string                // Believe in the Run
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
  sources?: ReviewSources
  confidence?: 'very-high' | 'high' | 'medium' | 'low'
}

export interface Brand {
  id: string
  name: string
  nameKo: string
  logo: string
  color: string
  description: string
  officialUrl?: string
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
