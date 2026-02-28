import { getAllShoes, getBrands } from '@/lib/data'
import AnimatedHeroContent from './AnimatedHeroContent'

export default function HeroSection() {
  const shoes = getAllShoes()
  const brands = getBrands()

  return (
    <AnimatedHeroContent
      totalCount={shoes.length}
      brandCount={brands.length}
    />
  )
}
