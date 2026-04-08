'use client'

import { useEffect, useState } from 'react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts'
import type { Specs } from '@/lib/types'
import { SPEC_LABELS } from '@/lib/constants'
import { chartTokens, chartFontFamily, chartMonoFamily } from '@/lib/chartTokens'

interface Props {
  specs: Specs
  confidence?: string
}

const MAX_SCORE_OFFSETS = [
  { dx: 0, dy: 12 },
  { dx: -12, dy: 10 },
  { dx: -12, dy: -10 },
  { dx: 12, dy: -10 },
  { dx: 12, dy: 10 },
] as const

function ValueLabel({
  x,
  y,
  value,
  index,
  isLow,
}: {
  x?: number
  y?: number
  value?: number
  index?: number
  isLow?: boolean
}) {
  if (x === undefined || y === undefined || value === undefined) return null

  const offset =
    value === 10 && index !== undefined
      ? MAX_SCORE_OFFSETS[index] ?? { dx: 0, dy: 0 }
      : { dx: 0, dy: 0 }
  const badgeX = x + offset.dx
  const badgeY = y + offset.dy

  return (
    <g>
      <rect x={badgeX - 12} y={badgeY - 10} width={24} height={20} fill={chartTokens.bgCard} rx={6} stroke={chartTokens.border} strokeWidth={0.5} />
      <text
        x={badgeX}
        y={badgeY}
        fill={isLow ? chartTokens.confLow : chartTokens.accent}
        fontSize={11}
        fontFamily={chartMonoFamily}
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="600"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {value}
      </text>
    </g>
  )
}

export default function SpecRadar({ specs, confidence }: Props) {
  const [animate, setAnimate] = useState(true)
  const isLow = confidence === 'low'
  const isMedium = confidence === 'medium'

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setAnimate(!mq.matches)
  }, [])

  const data = [
    { subject: SPEC_LABELS.cushioning,     value: specs.cushioning,         fullMark: 10 },
    { subject: SPEC_LABELS.responsiveness, value: specs.responsiveness,     fullMark: 10 },
    { subject: SPEC_LABELS.stability,      value: specs.stability,          fullMark: 10 },
    { subject: SPEC_LABELS.durability,     value: specs.durability,         fullMark: 10 },
    { subject: SPEC_LABELS.weightScore,    value: specs.weightScore ?? 0,   fullMark: 10 },
  ]

  const ariaLabel = `스펙 차트: 쿠션성 ${specs.cushioning}, 반응성 ${specs.responsiveness}, 안정성 ${specs.stability}, 내구성 ${specs.durability}, 경량성 ${specs.weightScore ?? 0}`

  return (
    <div role="img" aria-label={ariaLabel}>
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} margin={{ top: 18, right: 42, bottom: 18, left: 42 }}>
        <PolarGrid stroke={chartTokens.gridStroke} strokeWidth={chartTokens.gridWidth} />
        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
        <PolarAngleAxis
          dataKey="subject"
          tickSize={14}
          tick={{ fill: chartTokens.textTertiary, fontSize: 12, fontFamily: chartFontFamily, fontWeight: 500 }}
        />
        <Radar
          name="specs"
          dataKey="value"
          stroke={isLow ? chartTokens.confLow : chartTokens.accent}
          fill={isLow ? chartTokens.confLow : chartTokens.accent}
          fillOpacity={isLow ? 0.05 : isMedium ? 0.10 : 0.15}
          strokeWidth={2}
          strokeDasharray={isLow ? '4 4' : undefined}
          isAnimationActive={animate}
          animationDuration={600}
          animationEasing="ease-out"
          label={<ValueLabel isLow={isLow} />}
        />
      </RadarChart>
    </ResponsiveContainer>
    </div>
  )
}
