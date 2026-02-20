import { getAllShoes } from '@/lib/data'
import AnimatedHeroContent from './AnimatedHeroContent'

export default function HeroSection() {
  const shoes = getAllShoes()
  const totalCount = shoes.length

  return (
    <AnimatedHeroContent
      imageUrl="/images/hero_alpha3.png"
      totalCount={totalCount}
    />
  )
}
