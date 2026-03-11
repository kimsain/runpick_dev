import ShoeCard from './ShoeCard'
import type { Shoe } from '@/lib/types'

interface Props {
  shoes: Shoe[]
}

export default function RelatedShoes({ shoes }: Props) {
  if (shoes.length === 0) return null

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="font-display text-lg text-primary tracking-widest uppercase break-keep mb-8">
        유사한 러닝화
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        {shoes.map((shoe) => (
          <ShoeCard key={shoe.slug} shoe={shoe} />
        ))}
      </div>
    </section>
  )
}
