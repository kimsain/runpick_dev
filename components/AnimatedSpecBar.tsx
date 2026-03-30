interface Props {
  label: string
  value: number
  colorClass: string
  delay: number
}

export default function AnimatedSpecBar({ label, value, colorClass, delay }: Props) {
  const widthPct = `${Math.max(2, (value / 10) * 100)}%`

  return (
    <div
      className="flex items-center gap-2"
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={10}
    >
      <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} animate-scale-x`}
          style={{
            width: widthPct,
            transformOrigin: 'left',
            animationDelay: `${delay}s`,
          }}
        />
      </div>
      <span className="text-muted text-xs font-body w-9 shrink-0 truncate">
        {label}
      </span>
    </div>
  )
}
