import Link from 'next/link'
import { CONF_COLORS } from '@/lib/confidence'
import SpecCardsSection, { type SpecItem } from '@/components/SpecCardsSection'

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

const SPEC_ITEMS: SpecItem[] = [
  {
    name: '쿠션성',
    nameEn: 'Cushioning',
    color: 'var(--spec-cushion)',
    description:
      '힐과 포어풋의 충격흡수(Shock Attenuation, SA) 측정값을 기반으로 산출합니다. SA 값이 높을수록 충격을 효과적으로 흡수합니다.',
    basis: '힐/포어풋 SA 기반 0–10점',
    modalContent: {
      dataSource: 'RunRepeat Heel/Forefoot SA → RTINGS → 정성 리뷰 순으로 적용',
      formula:
        'raw = heelSA × 0.4 + forefootSA × 0.6\nscore = clamp(round(1 + (raw − 88) / 62 × 9), 1, 10)',
      rationale:
        'forefoot SA에 60% 가중 적용 (현대 midfoot 착지 주류). 범위 88~150: 하한=adizero-adios-9 기준, 상한=max-cushion 실용 상한 (p95). 2026-02-23 재보정.',
    },
  },
  {
    name: '반응성',
    nameEn: 'Responsiveness',
    color: 'var(--spec-response)',
    description:
      '에너지 리턴(Energy Return, ER%) 측정값을 기반으로 산출합니다. ER%가 높을수록 착지 시 에너지를 더 많이 돌려받습니다.',
    basis: '에너지 리턴 ER% 기반 0–10점',
    modalContent: {
      dataSource: 'RunRepeat Energy Return % → RTINGS 순으로 적용',
      formula:
        'avg_er = heelER × 0.4 + forefootER × 0.6\nscore = clamp(round((avg_er − 46) / 34 × 10), 1, 10)',
      rationale:
        '범위 46~80%. forefoot 60% 가중 (쿠션성과 동일). RTINGS-only 데이터 사용 시 카테고리별 −1~−3 페널티 적용. 2026-02-23 재보정.',
    },
  },
  {
    name: '안정성',
    nameEn: 'Stability',
    color: 'var(--spec-stability)',
    description:
      '전문가 리뷰에서 평가한 착지 안정성, 흔들림 제어, 가이드 레일 효과 등을 종합합니다.',
    basis: '전문가 리뷰 종합 0–10점',
    modalContent: {
      dataSource: 'RunRepeat torsionalRigidity + heelCounterStiffness → 전문가 리뷰 키워드 보정',
      formula:
        '# TR, HCS는 RunRepeat 1–5 스케일 → 1–10 정규화\ntr_norm = 1 + 9 × (TR − 2) / 3\nhcs_norm = 1 + 9 × (HCS − 1) / 4\nbase = 0.4 × tr_norm + 0.6 × hcs_norm  # midsoleWidth 없을 때\n# (midsoleWidth 있을 때: 0.35 × tr_norm + 0.50 × hcs_norm + 0.15 × width_norm)\n# sway 패널티: 높은 SA·스택 → 최대 −2점; ER% 높으면 일부 상쇄\n# subcategory=\'stability\' → base += 1\nscore = clamp(round(base), 1, 10)',
      rationale:
        'TR(2–5)·HCS(1–5) 각각 1–10 정규화 후 40/60 가중합산. 높은 SA·스택은 sway 패널티를 유발해 점수 감소; ER%가 높은 신발은 일부 상쇄. midsoleWidth 있을 때 35/50/15 가중합산. subcategory=stability +1 보너스. 리뷰 키워드 ±1 보정은 별도 적용.',
    },
  },
  {
    name: '내구성',
    nameEn: 'Durability',
    color: 'var(--spec-durability)',
    description:
      '아웃솔 고무 마모도, 미드솔 변형, 장거리 착용 후 상태 등 내구성 관련 데이터를 종합합니다.',
    basis: '아웃솔 내구성 평가 0–10점',
    modalContent: {
      dataSource: 'RunRepeat 아웃솔 두께·마모 측정값 → 전문가 리뷰 키워드 보정',
      formula:
        '# 두께+마모 데이터 모두 있을 때\nratio = outsoleThickness / outsoleDurability\noutsole_raw = log(ratio+1) / log(8.2) × 9 + 1\n# toebox·heel-pad durability(1–5 rating) 있을 때: 70/20/10 블렌딩\nscore = 0.70 × outsole_raw + 0.20 × toebox_norm + 0.10 × heelpad_norm\n# 없을 때: outsole_raw만 사용\nscore = clamp(round(outsole_raw), 1, 10)\n\n# 마모 데이터만 있을 때\ncapped = min(outsoleDurability, 10.0)\nscore = clamp(round((10.0 − capped) / 10.0 × 9 + 1), 1, 10)',
      rationale:
        '로그 스케일로 수확체감 반영. ratio ≥ 6.43이면 10점 만점. 두께 데이터 없을 때는 마모량 반비례 선형 공식으로 fallback.',
    },
  },
  {
    name: '경량성',
    nameEn: 'Lightness',
    color: 'var(--spec-weight)',
    description: '실측 무게(g) 기준 역정규화. 가벼울수록 높은 점수.',
    basis: '전 모델 실측 무게 역정규화 0–10점',
    modalContent: {
      dataSource: '실측 무게(g) — 항상 직접 계산',
      formula:
        'score = clamp(round(1 + 9 × (351 − weight) / 222), 1, 10)\nLIGHT = 129g (metaspeed-ray)  /  HEAVY = 351g (vomero-premium)',
      rationale:
        '고정 상수 사용 (신발 추가 시 기존 점수 불변), 선형 반비례. 기준값은 현재 데이터베이스 최경량·최중량 기준.',
    },
  },
  {
    name: '가성비',
    nameEn: 'Value',
    color: 'var(--spec-value)',
    description:
      '가격 대비 성능. (쿠션성+반응성+안정성+내구성) ÷ 가격 비율을 전 모델 대비 정규화.',
    basis: '성능 합산 ÷ 가격 비율 정규화 0–10점',
    modalContent: {
      dataSource: '4개 스펙 합산 ÷ 출시가(KRW) — 항상 직접 계산',
      formula:
        'ratio = (쿠션 + 반응 + 안정 + 내구) / price\nVALUE_RATIO_MIN = 22/599000  # 앵커: adizero-pro-evo-2\nVALUE_RATIO_MAX = 26.18/169000  # 앵커: novablast-5\nscore = clamp(round((ratio − MIN) / (MAX − MIN) × 9 + 1), 1, 10)',
      rationale:
        'weightScore와 동일한 min/max 고정 앵커 정규화. 앵커 최솟값(1점)=adizero-pro-evo-2, 최댓값(10점)=novablast-5. 신발 추가 시 기존 점수 불변. 경량성 미포함 (별도 독립 스펙). 할인가 미반영, 출시가(정가) 기준.',
    },
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
      'RunRepeat 또는 RTINGS 실측 데이터 + 전문가 리뷰 1개 이상이 확인된 경우.',
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
          가성비는 (쿠션성+반응성+안정성+내구성)÷가격 비율을 min/max 앵커 기준으로 정규화합니다.
        </p>
        <SpecCardsSection items={SPEC_ITEMS} />
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
              key={level.label}
              className="bg-card border border-elevated p-6 flex items-start gap-4"
            >
              <span
                className={`text-xs font-body px-2 py-1 shrink-0 ${level.badge}`}
              >
                {level.label}
              </span>
              <p className="text-secondary text-sm font-body">
                {level.description}
              </p>
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
          className="text-sm font-body text-secondary hover:text-accent transition-colors min-h-[44px] inline-flex items-center"
        >
          ← 홈으로 돌아가기
        </Link>
      </div>
    </main>
  )
}
