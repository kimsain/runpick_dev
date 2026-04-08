'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const NAV_LINKS = [
  { href: '/methodology', label: '점수 산정 방법' },
  { href: '/shoes', label: '탐색' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-30 bg-dark/70 backdrop-blur-md supports-[backdrop-filter]:bg-dark/60 transition-shadow duration-250 ease-out-quart ${scrolled ? 'shadow-elevated' : 'shadow-ring'}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl text-primary tracking-tight-1"
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
                className={`relative text-sm font-medium tracking-tight-1 transition-colors duration-200 ease-out-quart min-h-[44px] flex items-center ${
                  isActive ? 'text-primary' : 'text-tertiary hover:text-primary'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-accent" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
