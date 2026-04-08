import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Bebas_Neue } from 'next/font/google'
import './globals.css'
import { getBrands } from '@/lib/data'
import Navbar from '@/components/Navbar'

const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
})

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bebas',
})

const brandCount = getBrands().length

export const metadata: Metadata = {
  metadataBase: new URL('https://runpick.vercel.app'),
  title: 'RunPick — 러닝화 탐색',
  description: `${brandCount}개 브랜드 러닝화 데이터 기반 러닝화 탐색 플랫폼`,
  openGraph: {
    title: 'RunPick — 러닝화 탐색',
    description: `${brandCount}개 브랜드 러닝화 데이터 기반 러닝화 탐색 플랫폼`,
    type: 'website',
    images: ['/images/shoes/alphafly-3.webp'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${pretendard.variable} ${bebasNeue.variable}`}>
      <body className="bg-dark text-primary font-body antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-dark focus:font-body focus:text-sm focus:shadow-elevated"
        >
          본문으로 건너뛰기
        </a>
        <Navbar />

        {/* Page content — offset for nav */}
        <div id="main-content" tabIndex={-1} className="pt-16 outline-none">{children}</div>

        {/* Footer */}
        <footer className="border-t border-border mt-24 py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="font-display text-lg text-muted tracking-widest">RUNPICK</span>
            <p className="text-secondary text-sm font-body">
              러닝화 데이터 기반 탐색 플랫폼 · 실제 구매는 공식 사이트를 통해 진행하세요
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
