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

interface Props {
  specs: Specs
}

function ValueLabel({ x, y, value }: { x?: number; y?: number; value?: number }) {
  if (x === undefined || y === undefined || value === undefined) return null
  return (
    <g>
      <rect x={x - 9} y={y - 8} width={18} height={16} fill="#080808" rx={2} />
      <text
        x={x}
        y={y}
        fill="#c8ff00"
        fontSize={11}
        fontFamily="Outfit"
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="600"
      >
        {value}
      </text>
    </g>
  )
}

export default function SpecRadar({ specs }: Props) {
  const [animate, setAnimate] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setAnimate(!mq.matches)
  }, [])

  const data = [
    { subject: '쿠션성', value: specs.cushioning, fullMark: 10 },
    { subject: '반응성', value: specs.responsiveness, fullMark: 10 },
    { subject: '안정성', value: specs.stability, fullMark: 10 },
    { subject: '내구성', value: specs.durability, fullMark: 10 },
    { subject: '경량성', value: specs.weightScore ?? 0, fullMark: 10 },
  ]

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#1c1c1c" strokeWidth={1} />
        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#8c8c8c', fontSize: 12, fontFamily: 'Outfit' }}
        />
        <Radar
          name="specs"
          dataKey="value"
          stroke="#c8ff00"
          fill="#c8ff00"
          fillOpacity={0.15}
          strokeWidth={2}
          isAnimationActive={animate}
          animationDuration={800}
          animationEasing="ease-out"
          label={<ValueLabel />}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
