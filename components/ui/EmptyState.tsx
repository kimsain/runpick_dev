import type { ReactNode } from 'react'
import Eyebrow from './Eyebrow'

interface Props {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

/**
 * Reusable empty state for "no results" / "no recent searches" surfaces.
 * Centered layout with shadow-ring icon circle, eyebrow, headline, body, and an action slot.
 */
export default function EmptyState({
  eyebrow,
  title,
  description,
  action,
  icon,
  className = '',
}: Props) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className}`}>
      {icon && (
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-ring text-tertiary">
          {icon}
        </div>
      )}
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h3 className="font-display text-md text-primary tracking-tight-2 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm font-body text-tertiary leading-relaxed max-w-md mb-6">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
