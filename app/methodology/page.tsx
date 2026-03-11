import Link from 'next/link'
import { CONF_COLORS } from '@/lib/confidence'
import SpecCardsSection from '@/components/SpecCardsSection'
import { SPEC_ITEMS } from './data/specItems'

const DATA_SOURCES = [
  {
    name: 'RunRepeat',
    type: '실측 측정',
    description:
      '힐/포어풋 충격흡수(SA), 에너지 리턴(ER%), 무게 등 실측 장비로 측정한 정량 데이터를 제공합니다.',
    data: ['Heel SA · Forefoot SA', 'Energy Return %', 'Weight (g)'],
    typeClass: 'border-spec-cushion/20 bg-spec-cushion/10 text-spec-cushion',
  },
  {
    name: 'RTINGS',
    type: '실측 + 착용 테스트',
    description:
      '자체 장비 측정과 표준화된 착용 테스트를 병행하여 스펙과 실착 데이터를 모두 수집합니다.',
    data: ['무게 · 스택 하이트', '플랫폼 폭 · width-to-stack', 'long-run 에너지 유지율'],
    typeClass: 'border-spec-response/20 bg-spec-response/10 text-spec-response',
  },
  {
    name: 'Doctors of Running',
    type: '전문가 리뷰',
    description:
      '물리치료사 · 생체역학 전문가가 안정성, 착지감, 주법별 적합성을 분석합니다.',
    data: ['안정성 분석', '착지감 · 전환 평가', '주법 적합성'],
    typeClass: 'border-spec-stability/20 bg-spec-stability/10 text-spec-stability',
  },
  {
    name: 'Road Trail Run',
    type: '전문가 리뷰',
    description:
      '장거리 실착 테스트를 통해 내구성과 다양한 노면에서의 활용성을 평가합니다.',
    data: ['내구성 평가', '다목적 활용', '장거리 착용감'],
    typeClass: 'border-spec-durability/20 bg-spec-durability/10 text-spec-durability',
  },
  {
    name: 'Believe in the Run',
    type: '전문가 리뷰',
    description:
      '실제 레이스와 훈련에서의 퍼포먼스, 착용감을 중심으로 리뷰합니다.',
    data: ['착용감 분석', '레이스 퍼포먼스', '가성비 평가'],
    typeClass: 'border-spec-value/20 bg-spec-value/10 text-spec-value',
  },
]


const CONFIDENCE_LEVELS = [
  {
    label: 'VERIFIED',
    badge: CONF_COLORS['very-high'],
    description:
      'RunRepeat와 RTINGS 두 실측 측정 데이터가 모두 확인된 경우. 계측 장비 기반 데이터 2종과 전문가 리뷰를 종합한 최고 신뢰도입니다.',
  },
  {
    label: 'RELIABLE',
    badge: CONF_COLORS['high'],
    description:
      'RunRepeat 또는 RTINGS 중 하나의 실측 데이터가 확인된 경우. 전문가 리뷰 수와 무관하게 정량 데이터 1종을 확보한 상태입니다.',
  },
  {
    label: 'LIMITED',
    badge: CONF_COLORS['medium'],
    description:
      '실측 데이터 없이 전문가 리뷰 2개 이상이 확인된 경우.',
  },
  {
    label: 'PENDING',
    badge: CONF_COLORS['low'],
    description:
      '정량 데이터가 없고 전문가 리뷰도 1개 이하이거나, 전체 데이터가 매우 제한적인 경우.',
  },
]

export default function MethodologyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
      {/* Hero */}
      <div className="mb-16 sm:mb-20">
        <p className="text-accent text-sm font-body tracking-widest uppercase mb-4">
          METHODOLOGY
        </p>
        <h1 className="mb-5 text-lg font-display leading-none text-primary break-keep sm:text-xl md:text-2xl">
          점수 산정 방법
        </h1>
        <p className="max-w-2xl text-sm font-body leading-relaxed text-secondary sm:text-base md:text-md">
          RunPick의 모든 데이터는 공개된 전문 측정 기관과 리뷰어의 실측 데이터를
          기반으로 합니다. 어떤 브랜드로부터도 후원을 받지 않습니다.
        </p>
      </div>

      {/* 데이터 수집 방법 */}
      <section className="mb-16 sm:mb-20">
        <h2 className="mb-8 text-md font-display uppercase tracking-widest text-primary break-keep sm:text-lg">
          데이터 소스
        </h2>
        <div className="space-y-4">
          {DATA_SOURCES.map((source) => (
            <div
              key={source.name}
              className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-border-hover"
            >
              <div className="flex items-baseline gap-3 mb-3">
                <h3 className="font-body text-primary font-bold text-base">
                  {source.name}
                </h3>
                <span className={`rounded-full border px-2.5 py-1 text-sm font-body ${source.typeClass}`}>
                  {source.type}
                </span>
              </div>
              <p className="mb-4 text-sm font-body leading-relaxed text-secondary">
                {source.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {source.data.map((d) => (
                  <span
                    key={d}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-body text-muted"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 점수 산정 방식 */}
      <section className="mb-16 sm:mb-20">
        <h2 className="mb-8 text-md font-display uppercase tracking-widest text-primary break-keep sm:text-lg">
          {SPEC_ITEMS.length}개 스펙 점수
        </h2>
        <p className="mb-8 max-w-2xl text-sm font-body leading-relaxed text-secondary">
          각 스펙은 0–10점으로 정규화됩니다. 쿠션성·반응성은 실측 데이터(SA, ER%)를
          최우선으로 적용하고, 안정성은 TR/HCS·플랫폼 폭·스택/소프트니스 sway·정성 신호를
          결합한 V3 공식을 사용합니다. 내구성은 아웃솔/어퍼 core에 hardness·정성 신호를 더하고,
          커버리지 60% 미만인 RTINGS long-run은 modifier-only로 반영합니다. 경량성은 전 모델 실측 무게를 역정규화하고,
          가성비는 (쿠션성+반응성+안정성+내구성)÷가격 비율을 min/max 앵커 기준으로 정규화합니다.
        </p>
        <SpecCardsSection items={SPEC_ITEMS} />
      </section>

      {/* 신뢰도 등급 */}
      <section className="mb-16 sm:mb-20">
        <h2 className="mb-8 text-md font-display uppercase tracking-widest text-primary break-keep sm:text-lg">
          신뢰도 등급
        </h2>
        <p className="mb-8 text-sm font-body text-secondary">
          수집된 데이터의 양과 출처 수에 따라 각 신발의 점수 신뢰도를 4단계로
          구분합니다.
        </p>
        <div className="space-y-3">
          {CONFIDENCE_LEVELS.map((level) => (
            <div
              key={level.label}
              className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
            >
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-body ${level.badge}`}
              >
                {level.label}
              </span>
              <p className="text-sm font-body leading-relaxed text-secondary">
                {level.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 한계 및 주의사항 */}
      <section className="mb-16 sm:mb-20">
        <h2 className="mb-8 text-md font-display uppercase tracking-widest text-primary break-keep sm:text-lg">
          한계 및 주의사항
        </h2>
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <p className="text-sm font-body leading-relaxed text-secondary">
            RunPick의 점수는 공개된 데이터를 기반으로 산출한{' '}
            <strong className="text-primary">참고 지표</strong>입니다. 다음 사항을
            유의해 주세요.
          </p>
          <ul className="space-y-3 text-secondary text-sm font-body">
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-accent">·</span>
              <span>
                발 형태, 체중, 주법에 따라 실제 착용감은 크게 다를 수 있습니다.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-accent">·</span>
              <span>
                동일 모델이라도 컬러웨이에 따라 무게나 핏이 미세하게 다를 수
                있습니다.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-accent">·</span>
              <span>
                출시 직후 신발은 전문가 리뷰가 충분하지 않아 신뢰도가 낮을 수
                있습니다.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-accent">·</span>
              <span>
                점수는 새로운 데이터가 수집될 때마다 업데이트됩니다.
              </span>
            </li>
          </ul>
          <p className="pt-2 text-sm font-body text-muted">
            가능하다면 매장에서 직접 신어보고 구매하시길 권장합니다.
          </p>
        </div>
      </section>

      {/* 돌아가기 */}
      <div className="border-t border-border pt-8">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-body text-secondary transition-colors hover:bg-accent/5 hover:text-accent"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          홈으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
