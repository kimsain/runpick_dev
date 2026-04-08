import ShoeCard from './ShoeCard'
import AnimatedCardGrid from './AnimatedCardGrid'
import type { Shoe } from '@/lib/types'
import SectionHeading from '@/components/ui/SectionHeading'

interface Props {
  shoes: Shoe[]
}

export default function RelatedShoes({ shoes }: Props) {
  if (shoes.length === 0) return null

  return (
    <section className="mt-16 border-t border-border pt-12">
      <SectionHeading eyebrow="RELATED" className="mb-8">유사한 러닝화</SectionHeading>
      <AnimatedCardGrid className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        {shoes.map((shoe) => (
          <ShoeCard key={shoe.slug} shoe={shoe} />
        ))}
      </AnimatedCardGrid>
    </section>
  )
}
