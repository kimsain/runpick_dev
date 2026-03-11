import Link from 'next/link'
import type { ScoreMethodNoticeContent } from '@/lib/scoreMethodNotice'

interface Props {
  notice: ScoreMethodNoticeContent
  linkHref?: string
  linkLabel?: string
  className?: string
}

export default function ScoreMethodNotice({
  notice,
  linkHref,
  linkLabel,
  className = '',
}: Props) {
  return (
    <div
      className={`border border-spec-stability/25 bg-spec-stability/5 px-4 py-3 ${className}`.trim()}
    >
      <div className="flex gap-3">
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-spec-stability" />
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-spec-stability/25 bg-spec-stability/10 px-2 py-1 text-xs font-body text-spec-stability">
              {notice.label}
            </span>
            <p className="text-sm font-body font-medium text-primary">{notice.title}</p>
          </div>
          <p className="text-sm font-body leading-relaxed text-secondary">{notice.description}</p>
          {linkHref && linkLabel && (
            <Link
              href={linkHref}
              className="mt-2 inline-flex min-h-[44px] items-center text-sm font-body text-spec-stability transition-colors hover:text-spec-stability/80"
            >
              {linkLabel} →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
