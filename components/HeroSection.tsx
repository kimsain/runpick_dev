import { getAllShoes } from '@/lib/data'
import AnimatedHeroContent from './AnimatedHeroContent'

export default function HeroSection() {
  const shoes = getAllShoes()
  const totalCount = shoes.length

  return (
    <AnimatedHeroContent
      totalCount={totalCount}
    />
  )
}
