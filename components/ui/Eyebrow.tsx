import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  as?: 'p' | 'span' | 'div'
}

/**
 * Mono uppercase section label.
 * design-md pattern (linear / vercel / supabase / figma):
 * small mono font + positive letter-spacing + tertiary tone
 * above section headings for a developer-tool premium signal.
 */
export default function Eyebrow({ children, className = '', as: Tag = 'p' }: Props) {
  return (
    <Tag
      className={`font-mono text-eyebrow uppercase text-tertiary ${className}`}
    >
      {children}
    </Tag>
  )
}
