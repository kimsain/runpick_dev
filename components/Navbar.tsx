'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/methodology', label: '점수 산정 방법' },
  { href: '/shoes', label: '탐색' },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-dark/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl text-primary tracking-widest"
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          RUNPICK
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`relative text-sm font-body transition-colors min-h-[44px] flex items-center ${
                  isActive ? 'text-accent' : 'text-secondary hover:text-primary'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-2 left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
