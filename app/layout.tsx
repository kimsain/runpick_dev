import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  metadataBase: new URL('https://runpick.vercel.app'),
  title: 'RunPick — 러닝화 탐색',
  description: '9개 브랜드 러닝화 데이터 기반 러닝화 탐색 플랫폼',
  openGraph: {
    title: 'RunPick — 러닝화 탐색',
    description: '9개 브랜드 러닝화 데이터 기반 러닝화 탐색 플랫폼',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-base text-primary font-body antialiased">
        {/* Nav */}
        <header className="fixed top-0 left-0 right-0 z-30 bg-base/90 backdrop-blur-sm border-b border-elevated">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="font-display text-xl text-primary tracking-widest">
              RUNPICK
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/methodology"
                className="text-sm font-body text-secondary hover:text-primary transition-colors"
              >
                점수 산정 방법
              </Link>
              <Link
                href="/shoes"
                className="text-sm font-body text-secondary hover:text-primary transition-colors"
              >
                탐색
              </Link>
            </nav>
          </div>
        </header>

        {/* Page content — offset for nav */}
        <div className="pt-16">{children}</div>

        {/* Footer */}
        <footer className="border-t border-elevated mt-24 py-12 px-6">
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
