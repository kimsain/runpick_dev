import Link from 'next/link'
import type { ScoreMethodNoticeContent } from '@/lib/scoreMethodNotice'
import Eyebrow from '@/components/ui/Eyebrow'

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
  className,
}: Props) {
  return (
    <div className={`rounded-lg shadow-ring bg-notice-soft px-3 py-2.5 flex items-start gap-3 ${className ?? ''}`}>
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-notice"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4M12 16h.01" />
      </svg>
      <div className="flex-1 min-w-0">
        <Eyebrow className="text-notice mb-1">방법론 안내</Eyebrow>
        <p className="text-sm font-body text-secondary leading-relaxed">{notice.description}</p>
        {linkHref && (
          <Link href={linkHref} className="mt-2 inline-block font-mono text-eyebrow uppercase text-tertiary hover:text-notice transition-colors duration-200 ease-out-quart">
            {linkLabel ?? '방법론 →'}
          </Link>
        )}
      </div>
    </div>
  )
}
