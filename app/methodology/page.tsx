import Link from 'next/link'
import { CONF_COLORS } from '@/lib/confidence'

const DATA_SOURCES = [
  {
    name: 'RunRepeat',
    type: '실측 측정',
    description:
      '힐/포어풋 충격흡수(SA), 에너지 리턴(ER%), 무게 등 실측 장비로 측정한 정량 데이터를 제공합니다.',
    data: ['Heel SA · Forefoot SA', 'Energy Return %', 'Weight (g)'],
  },
  {
    name: 'RTINGS',
    type: '실측 + 착용 테스트',
    description:
      '자체 장비 측정과 표준화된 착용 테스트를 병행하여 스펙과 실착 데이터를 모두 수집합니다.',
    data: ['무게 · 스택 하이트', '착용 테스트 스코어', '아웃솔 내구성'],
  },
  {
    name: 'Doctors of Running',
    type: '전문가 리뷰',
    description:
      '물리치료사 · 생체역학 전문가가 안정성, 착지감, 주법별 적합성을 분석합니다.',
    data: ['안정성 분석', '착지감 · 전환 평가', '주법 적합성'],
  },
  {
    name: 'Road Trail Run',
    type: '전문가 리뷰',
    description:
      '장거리 실착 테스트를 통해 내구성과 다양한 노면에서의 활용성을 평가합니다.',
    data: ['내구성 평가', '다목적 활용', '장거리 착용감'],
  },
  {
    name: 'Believe in the Run',
    type: '전문가 리뷰',
    description:
      '실제 레이스와 훈련에서의 퍼포먼스, 착용감을 중심으로 리뷰합니다.',
    data: ['착용감 분석', '레이스 퍼포먼스', '가성비 평가'],
  },
]

const SPEC_ITEMS = [
  {
    name: '쿠션성',
    nameEn: 'Cushioning',
    color: 'var(--spec-cushion)',
    description:
      '힐과 포어풋의 충격흡수(Shock Attenuation, SA) 측정값을 기반으로 산출합니다. SA 값이 높을수록 충격을 효과적으로 흡수합니다.',
    basis: '힐/포어풋 SA 기반 0–10점',
  },
  {
    name: '반응성',
    nameEn: 'Responsiveness',
    color: 'var(--spec-response)',
    description:
      '에너지 리턴(Energy Return, ER%) 측정값을 기반으로 산출합니다. ER%가 높을수록 착지 시 에너지를 더 많이 돌려받습니다.',
    basis: '에너지 리턴 ER% 기반 0–10점',
  },
  {
    name: '안정성',
    nameEn: 'Stability',
    color: 'var(--spec-stability)',
    description:
      '전문가 리뷰에서 평가한 착지 안정성, 흔들림 제어, 가이드 레일 효과 등을 종합합니다.',
    basis: '전문가 리뷰 종합 0–10점',
  },
  {
    name: '내구성',
    nameEn: 'Durability',
    color: 'var(--spec-durability)',
    description:
      '아웃솔 고무 마모도, 미드솔 변형, 장거리 착용 후 상태 등 내구성 관련 데이터를 종합합니다.',
    basis: '아웃솔 내구성 평가 0–10점',
  },
  {
    name: '경량성',
    nameEn: 'Lightness',
    color: 'var(--spec-weight)',
    description:
      '실측 무게(g) 기준 역정규화. 가벼울수록 높은 점수.',
    basis: '전 모델 실측 무게 역정규화 0–10점',
  },
  {
    name: '가성비',
    nameEn: 'Value',
    color: 'var(--spec-value)',
    description:
      '가격 대비 성능. (쿠션성+반응성+안정성+내구성) ÷ 가격 비율을 전 모델 대비 정규화.',
    basis: '성능 합산 ÷ 가격 비율 정규화 0–10점',
  },
]

const CONFIDENCE_LEVELS = [
  {
    label: 'VERIFIED',
    labelEn: 'Verified',
    badge: CONF_COLORS['very-high'],
    description:
      'RunRepeat와 RTINGS 두 실측 측정 데이터가 모두 확인된 경우. 계측 장비 기반 데이터 2종과 전문가 리뷰를 종합한 최고 신뢰도입니다.',
  },
  {
    label: 'RELIABLE',
    labelEn: 'High',
    badge: CONF_COLORS['high'],
    description:
      'RunRepeat 또는 RTINGS 실측 데이터 + 전문가 리뷰 1개 이상이 확인된 경우.',
  },
  {
    label: 'LIMITED',
    labelEn: 'Medium',
    badge: CONF_COLORS['medium'],
    description:
      '실측 데이터 없이 전문가 리뷰 2개 이상이 확인된 경우.',
  },
  {
    label: 'PENDING',
    labelEn: 'Low',
    badge: CONF_COLORS['low'],
    description:
      '전문가 리뷰 1개 이하 또는 제한적인 데이터만 존재하는 경우.',
  },
]

export default function MethodologyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="mb-16">
        <p className="text-accent text-sm font-body tracking-widest uppercase mb-4">
          METHODOLOGY
        </p>
        <h1 className="font-display text-2xl text-primary leading-none mb-6">
          점수 산정 방법
        </h1>
        <p className="text-secondary font-body text-lg max-w-2xl">
          RunPick의 모든 데이터는 공개된 전문 측정 기관과 리뷰어의 실측 데이터를
          기반으로 합니다. 어떤 브랜드로부터도 후원을 받지 않습니다.
        </p>
      </div>

      {/* 데이터 수집 방법 */}
      <section className="mb-16">
        <h2 className="font-display text-lg text-primary tracking-widest uppercase mb-8">
          데이터 소스
        </h2>
        <div className="space-y-4">
          {DATA_SOURCES.map((source) => (
            <div
              key={source.name}
              className="bg-card border border-elevated p-6"
            >
              <div className="flex items-baseline gap-3 mb-3">
                <h3 className="font-body text-primary font-bold text-base">
                  {source.name}
                </h3>
                <span className="text-sm font-body text-accent bg-accent/10 px-2 py-1">
                  {source.type}
                </span>
              </div>
              <p className="text-secondary text-sm font-body mb-4">
                {source.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {source.data.map((d) => (
                  <span
                    key={d}
                    className="text-xs font-body text-muted bg-surface px-2 py-1 border border-elevated"
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
      <section className="mb-16">
        <h2 className="font-display text-lg text-primary tracking-widest uppercase mb-8">
          6개 스펙 점수
        </h2>
        <p className="text-secondary text-sm font-body mb-8">
          각 스펙은 0–10점으로 정규화됩니다. 쿠션성·반응성은 실측 데이터(SA, ER%)를
          최우선으로 적용하고, 안정성·내구성은 실측 기준값에 전문가 리뷰 키워드 분석
          결과를 ±1 보정하여 반영합니다. 경량성은 전 모델 실측 무게를 역정규화하고,
          가성비는 (쿠션성+반응성+안정성+내구성)÷가격 비율을 정규화합니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPEC_ITEMS.map((spec) => (
            <div
              key={spec.nameEn}
              className="bg-card border border-elevated p-6"
            >
              <div className="flex items-baseline gap-2 mb-3">
                <span
                  className="font-display text-xl"
                  style={{ color: spec.color }}
                >
                  {spec.name}
                </span>
                <span className="text-sm font-body text-muted">
                  {spec.nameEn}
                </span>
              </div>
              <p className="text-secondary text-sm font-body mb-3">
                {spec.description}
              </p>
              <p className="text-xs font-body text-muted">{spec.basis}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 신뢰도 등급 */}
      <section className="mb-16">
        <h2 className="font-display text-lg text-primary tracking-widest uppercase mb-8">
          신뢰도 등급
        </h2>
        <p className="text-secondary text-sm font-body mb-8">
          수집된 데이터의 양과 출처 수에 따라 각 신발의 점수 신뢰도를 4단계로
          구분합니다.
        </p>
        <div className="space-y-4">
          {CONFIDENCE_LEVELS.map((level) => (
            <div
              key={level.labelEn}
              className="bg-card border border-elevated p-6 flex items-start gap-4"
            >
              <span
                className={`text-sm font-body px-2 py-1 shrink-0 ${level.badge}`}
              >
                {level.label}
              </span>
              <div>
                <span className="text-sm font-body text-muted mb-1 block">
                  {level.labelEn}
                </span>
                <p className="text-secondary text-sm font-body">
                  {level.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 한계 및 주의사항 */}
      <section className="mb-16">
        <h2 className="font-display text-lg text-primary tracking-widest uppercase mb-8">
          한계 및 주의사항
        </h2>
        <div className="bg-card border border-elevated p-6 space-y-4">
          <p className="text-secondary text-sm font-body">
            RunPick의 점수는 공개된 데이터를 기반으로 산출한{' '}
            <strong className="text-primary">참고 지표</strong>입니다. 다음 사항을
            유의해 주세요.
          </p>
          <ul className="space-y-3 text-secondary text-sm font-body">
            <li className="flex gap-2">
              <span className="text-muted shrink-0">·</span>
              <span>
                발 형태, 체중, 주법에 따라 실제 착용감은 크게 다를 수 있습니다.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted shrink-0">·</span>
              <span>
                동일 모델이라도 컬러웨이에 따라 무게나 핏이 미세하게 다를 수
                있습니다.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted shrink-0">·</span>
              <span>
                출시 직후 신발은 전문가 리뷰가 충분하지 않아 신뢰도가 낮을 수
                있습니다.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-muted shrink-0">·</span>
              <span>
                점수는 새로운 데이터가 수집될 때마다 업데이트됩니다.
              </span>
            </li>
          </ul>
          <p className="text-muted text-sm font-body pt-2">
            가능하다면 매장에서 직접 신어보고 구매하시길 권장합니다.
          </p>
        </div>
      </section>

      {/* 돌아가기 */}
      <div className="border-t border-elevated pt-8">
        <Link
          href="/"
          className="text-sm font-body text-secondary hover:text-accent transition-colors"
        >
          ← 홈으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
