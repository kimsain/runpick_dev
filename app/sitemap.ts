import type { MetadataRoute } from 'next'
import { getAllSlugs } from '@/lib/data'

export default function sitemap(): MetadataRoute.Sitemap {
  const slugs = getAllSlugs()

  const shoePages: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `https://runpick.vercel.app/shoes/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  return [
    {
      url: 'https://runpick.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://runpick.vercel.app/shoes',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: 'https://runpick.vercel.app/methodology',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...shoePages,
  ]
}
