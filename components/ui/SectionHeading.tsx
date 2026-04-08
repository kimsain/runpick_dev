import type { ReactNode } from 'react'
import Eyebrow from './Eyebrow'

interface Props {
  /** Mono uppercase eyebrow label rendered above the heading. */
  eyebrow?: ReactNode
  /** Main heading content. */
  children: ReactNode
  /** Optional secondary copy below the heading. */
  subhead?: ReactNode
  /** Heading element. Defaults to h2. */
  as?: 'h1' | 'h2' | 'h3'
  /** Container className extension. */
  className?: string
  /** Override for heading typography. */
  headingClassName?: string
  /** Optional accent color override for the eyebrow (e.g. "text-spec-value"). */
  eyebrowClassName?: string
  /** Center-align the block. */
  align?: 'left' | 'center'
}

/**
 * Three-tier section heading: Eyebrow → Display heading → Body subhead.
 * design-md pattern (vercel/linear/stripe): every section heads with this rhythm.
 */
export default function SectionHeading({
  eyebrow,
  children,
  subhead,
  as: Tag = 'h2',
  className = '',
  headingClassName = 'font-display text-xl sm:text-2xl text-primary tracking-tight-3 break-keep',
  eyebrowClassName = '',
  align = 'left',
}: Props) {
  const alignCls = align === 'center' ? 'text-center items-center' : 'text-left items-start'
  return (
    <div className={`flex flex-col ${alignCls} gap-2 ${className}`}>
      {eyebrow && <Eyebrow className={eyebrowClassName}>{eyebrow}</Eyebrow>}
      <Tag className={headingClassName}>{children}</Tag>
      {subhead && (
        <p className="text-sm font-body text-secondary leading-relaxed max-w-2xl">
          {subhead}
        </p>
      )}
    </div>
  )
}
