import ShoeCard from './ShoeCard'
import type { Shoe } from '@/lib/types'

interface Props {
  shoes: Shoe[]
}

export default function RelatedShoes({ shoes }: Props) {
  if (shoes.length === 0) return null

  return (
    <section className="mt-16 pt-12 border-t border-elevated">
      <h2 className="font-display text-lg text-primary tracking-widest uppercase mb-8">
        유사한 러닝화
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {shoes.map((shoe) => (
          <ShoeCard key={shoe.slug} shoe={shoe} />
        ))}
      </div>
    </section>
  )
}
