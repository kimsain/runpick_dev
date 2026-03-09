export interface SpecConstant {
  name: string
  value: string
  meaning: string
}

export interface SpecItem {
  id: string
  name: string
  nameEn: string
  color: string
  summary: string   // 카드용 1-2줄
  basis: string     // 카드용 1줄 기준 요약
  modalContent: {
    general: {
      description: string   // 일반인용 설명
      impact?: string       // 점수 높을 때 / 낮을 때 체감
    }
    expert: {
      dataSource: string
      formula: string
      rationale: string
      constants?: SpecConstant[]
    }
  }
}

export const SPEC_ITEMS: SpecItem[] = [
  {
    id: 'cushioning',
    name: '쿠션성',
    nameEn: 'Cushioning',
    color: 'var(--spec-cushion)',
    summary:
      '힐과 포어풋의 충격흡수(SA) 실측값 기반. 발이 지면에 닿을 때 충격이 얼마나 잘 흡수되는지 수치화합니다.',
    basis: '힐/포어풋 SA 실측값 → 1–10점',
    modalContent: {
      general: {
        description:
          '점수가 높을수록 착지 충격이 부드럽게 흡수됩니다. 장거리를 달리거나 관절 부담을 줄이고 싶은 러너에게 중요한 지표입니다. 폼의 종류와 두께가 주요 변수이며, 같은 두께라도 폼 재질에 따라 점수가 달라집니다.',
        impact:
          '8–10점: 착지 충격이 거의 느껴지지 않는 폭신한 감각. 1–3점: 지면이 발에 직접 전달되는 단단하고 반응적인 느낌.',
      },
      expert: {
        dataSource:
          'RunRepeat Heel/Forefoot SA(충격흡수) 우선 적용 → RTINGS SA 보조 → 정성 리뷰는 결측·이탈 구간 보정용',
        formula:
          'raw = heelSA × 0.4 + forefootSA × 0.6\nscore = clamp(round(1 + (raw − 88) / 62 × 9), 1, 10)',
        rationale:
          'GRF(Ground Reaction Force) 피크가 지면 접촉에서 미드솔로 전달될 때 점탄성(viscoelastic) 손실이 충격 강도를 감쇠시켜 체감 충격을 줄인다. 포어풋 구간은 주행의 주 동력 전달 구간이므로 에너지 완충의 핵심 기여로 60% 가중치를 부여한다. 원시 SA는 최저~최고 경계 기반의 min-max 정규화 후 1–10 스케일로 변환해 모델 간 비교 가능성을 확보한다. 정규화 범위를 벗어나는 극단값이 등장할 때만 앵커를 갱신하는 래칫(ratchet) 규칙으로 척도의 종단적 일관성을 유지한다.',
        constants: [
          { name: 'CUSH_MIN_SA', value: '88', meaning: 'SA 하한 앵커 (adizero-adios-9 기준)' },
          { name: 'CUSH_MAX_SA', value: '150', meaning: 'SA 상한 앵커 (max-cushion p95 기준)' },
          {
            name: '힐 / 포어풋 가중치',
            value: '40% / 60%',
            meaning: '현대 midfoot 착지 패턴 반영',
          },
        ],
      },
    },
  },
  {
    id: 'responsiveness',
    name: '반응성',
    nameEn: 'Responsiveness',
    color: 'var(--spec-response)',
    summary:
      '착지 에너지가 얼마나 되돌아오는지(에너지 리턴%) 실측값 기반. 높을수록 발이 앞으로 밀리는 느낌을 줍니다.',
    basis: '에너지 리턴 ER% 실측값 → 1–10점',
    modalContent: {
      general: {
        description:
          '점수가 높을수록 착지할 때 에너지를 많이 되돌려줍니다. 카본 플레이트나 탄성 좋은 폼이 장착된 신발에서 높게 나타납니다. 빠른 템포로 달릴수록 이 지표가 더 체감됩니다.',
        impact:
          '8–10점: 발이 땅에서 튕기듯 앞으로 밀리는 느낌, 페이스가 자연스럽게 유지됨. 1–3점: 에너지 흡수형, 착지가 묵직하고 안정적인 느낌.',
      },
      expert: {
        dataSource:
          'RunRepeat Energy Return %(ER%) 우선 적용 → RTINGS ER% 보조 → 정성 리뷰는 카테고리 오차 보정에만 사용',
        formula:
          'avg_er = heelER × 0.4 + forefootER × 0.6\nscore = clamp(round((avg_er − 46) / 34 × 10), 1, 10)',
        rationale:
          '에너지 리턴은 착지 후 저장 에너지 중 반발 탄성(resilience)으로 되돌아오는 비율이며, 이력 손실(hysteresis loss)이 클수록 전환 효율이 감소한다. 포어풋이 에너지 방출 구간을 크게 차지하므로 60% 가중치로 반응성 핵심 항목을 반영한다. ER 분포는 46~80% 범위를 min-max 정규화해 1–10 스케일로 통일하고, 카테고리별 오차는 고정 규칙 기반으로 완화한다. RTINGS-only와 결측 구간은 규칙 보정으로 스케일 정합성을 확보한다.',
        constants: [
          {
            name: 'RESP_LO',
            value: '46%',
            meaning: 'ER% 하한 앵커 → 1점 경계 ~51.1%',
          },
          {
            name: 'RESP_RANGE_INT',
            value: '34',
            meaning: '정수 스케일 범위 (46~80%), avg ER% ≥78.3% → 10점',
          },
          {
            name: '힐 / 포어풋 가중치',
            value: '40% / 60%',
            meaning: '쿠션성과 동일 가중치 통일',
          },
        ],
      },
    },
  },
  {
    id: 'stability',
    name: '안정성',
    nameEn: 'Stability',
    color: 'var(--spec-stability)',
    summary:
      '착지 시 발이 얼마나 안정적으로 지지되는지 수치화합니다. TR/HCS, 플랫폼 폭, 스택/소프트니스 sway, 구조화된 리뷰 신호를 함께 반영합니다.',
    basis: 'TR/HCS + 플랫폼 폭/비율 + sway 패널티 + 정성 signal → 1–10점',
    modalContent: {
      general: {
        description:
          '점수가 높을수록 발이 좌우로 흔들리지 않고 안정적으로 착지합니다. 발목이 약하거나 과도하게 안쪽으로 돌아가는(초과 회내) 러너에게 특히 중요한 지표입니다. 구조가 단단하고 플랫폼이 넓을수록 점수가 올라가고, 높은 스택과 부드러운 폼이 겹치면 sway 패널티가 적용됩니다.',
        impact:
          '8–10점: 가이드 레일 느낌으로 발이 중립을 잡아줌, 장거리 후반에도 흔들림 적음. 1–3점: 발의 움직임이 자유롭지만 지지가 적어 발목 컨트롤이 필요.',
      },
      expert: {
        dataSource:
          'RunRepeat TR/HCS + RunRepeat midsole width + RTINGS outsole width/width-to-stack + RunRepeat·RTINGS stack/firmness + qualitative share signal',
        formula:
          'structure = 0.55 × TR_norm + 0.45 × HCS_norm\nplatform = weighted_mean(RR midsole 45%, RT outsole 35%, RT ratio 20%)\ncore = weighted_mean(structure 55%, platform 45%)\nraw = core_or_5.5 + SUBCAT_STAB_DELTA − swayPenalty + qualitativeModifier\nscore = clamp(round(1 + 9 × (raw − 2.4419) / (9.3481 − 2.4419)), 1, 10)',
        rationale:
          'V3는 구조 강성, 플랫폼 지지 면적, 스택-소프트니스 기반 sway, 정성 containment 신호를 분리해서 계산합니다. stack 입력 우선순위는 RunRepeat physical stack → RTINGS physical stack → production spec이며, softness는 RunRepeat AC → RTINGS firmness proxy → subcategory prior 순서로 선택합니다. 정성 신호는 lockdown, guidance/sidewall, wide base, heel slip, instability의 source share로 계산해 free-text ±1 보정보다 일관성을 높였습니다.',
        constants: [
          {
            name: 'Structure 가중치',
            value: 'TR 55% / HCS 45%',
            meaning: 'RunRepeat 구조 강성 신호 결합',
          },
          {
            name: 'Platform 가중치',
            value: 'RR width 45% / RT outsole 35% / RT ratio 20%',
            meaning: '플랫폼 신호 결합 비율',
          },
          {
            name: 'Qualitative modifier',
            value: '+0.30 lockdown +0.35 guidance +0.20 wideBase −0.45 heelSlip −0.60 instability',
            meaning: 'source share 기반 raw modifier, cap ±1.25',
          },
          {
            name: 'Stack / softness',
            value: 'RunRepeat stack 우선, 없으면 RTINGS stack / AC→firmness→subcategory prior',
            meaning: 'sway 패널티 입력 우선순위',
          },
          {
            name: 'STAB_RAW_MIN / MAX',
            value: '2.4419 / 9.3481',
            meaning: 'Bottom-5 / Top-5 경계 (--calibrate 자동 갱신)',
          },
        ],
      },
    },
  },
  {
    id: 'durability',
    name: '내구성',
    nameEn: 'Durability',
    color: 'var(--spec-durability)',
    summary:
      '오래 신어도 밑창과 어퍼가 얼마나 잘 버티는지 수치화합니다. 아웃솔/어퍼 core에 hardness, long-run, 구조화된 리뷰 신호를 합쳐 계산합니다.',
    basis: '아웃솔/어퍼 core + hardness/long-run/정성 modifier → 1–10점',
    modalContent: {
      general: {
        description:
          '점수가 높을수록 밑창과 어퍼가 오래 버티는 신발입니다. 아웃솔 고무 두께와 마모 속도, 토박스와 힐 패딩 마모, 정성 리뷰의 wear/longevity 언급을 함께 봅니다. 경량 레이싱화는 재료 특성상 낮게 나타날 수 있습니다.',
        impact:
          '8–10점: 고내구성 고무 아웃솔, 수백km 후에도 밑창 손상 적음. 1–3점: 얇은 아웃솔 또는 빠른 마모, 레이싱화 등에서 흔히 나타남.',
      },
      expert: {
        dataSource:
          'RunRepeat outsole thickness/abrasion + toebox/heel padding durability + RunRepeat outsole hardness + RTINGS long-run retention + qualitative durability shares',
        formula:
          'outsole = log(thickness / abrasion + 1) / log(8.2) × 9 + 1\nupper = 0.60 × toebox_norm + 0.40 × heelPad_norm\nmidsoleModifier = capped((longRunScore − 5.5) / 4.5, ±1.0)  # 2026-03 rollout\nraw = core_or_5.5 + midsoleModifier + compoundModifier + qualitativeModifier\nscore = clamp(round(1 + 9 × (raw − 3.6575) / (9.3335 − 3.6575)), 1, 10)',
        rationale:
          'V3는 outsole과 upper를 내구성 core로 두고, outsole hardness와 리뷰 기반 wear/longevity 신호를 raw modifier로 더합니다. RTINGS long-run retention은 유용하지만 현재 merged research 커버리지가 52.2%라서 core가 아니라 modifier-only로 사용합니다. core가 없는 RTINGS-only/리뷰-only 신발은 neutral prior 5.5에서 시작해 modifier만 반영합니다.',
        constants: [
          { name: 'DUR_LOG_BASE', value: '8.2', meaning: '로그 스케일 밑수 (수확체감 반영)' },
          {
            name: 'Core 가중치',
            value: 'Outsole 60% / Upper 20%',
            meaning: '현재 rollout에서는 long-run을 core에서 제외',
          },
          {
            name: 'Long-run rule',
            value: '0.90→1점, 0.98→10점, 현재는 modifier-only (cap ±1.0)',
            meaning: 'RTINGS long-run retention 적용 규칙',
          },
          {
            name: 'Qualitative modifier',
            value: '+0.30 coverage +0.25 reinforcement +0.15 durable −0.45 earlyWear −0.35 exposedFoam −0.35 breakdown',
            meaning: 'source share 기반 raw modifier, cap ±1.5',
          },
          {
            name: 'DUR_RAW_MIN / MAX',
            value: '3.6575 / 9.3335',
            meaning: 'Bottom-5 / Top-5 경계 (--calibrate 자동 갱신)',
          },
        ],
      },
    },
  },
  {
    id: 'lightness',
    name: '경량성',
    nameEn: 'Lightness',
    color: 'var(--spec-weight)',
    summary: '실측 무게(g) 기준. 가벼울수록 높은 점수로, 고정 앵커로 전 모델 점수가 안정적입니다.',
    basis: '전 모델 실측 무게 역정규화 → 1–10점',
    modalContent: {
      general: {
        description:
          '신발이 가벼울수록 점수가 높습니다. 특히 장거리 레이스에서 수십km를 반복하면 신발 무게는 피로 누적에 직접 영향을 줍니다. 같은 브랜드 라인업이라도 레이싱화와 훈련화 간 차이가 크게 납니다.',
        impact:
          '8–10점: 190g 이하 초경량, 발이 없는 것처럼 가벼운 레이싱 느낌. 1–3점: 290g 이상 맥시멀 쿠션화·안정화 수준, 장거리 후반 다리가 무거울 수 있음.',
      },
      expert: {
        dataSource:
          '실측 무게(g) 우선 적용 — RunRepeat 또는 브랜드 공식 제원 보완, 항상 직접 계산',
        formula:
          'score = clamp(round(1 + 9 × (HEAVY_G − weight_g) / (HEAVY_G − LIGHT_G)), 1, 10)\n\nLIGHT_G = 129  # ASICS Metaspeed Sky Tokyo\nHEAVY_G = 351  # Nike Vomero Premium',
        rationale:
          '경량성은 관성 모멘트(mass moment of inertia)와 대사 비용(metabolic cost)에 직접 작용해 지속 속도와 피로 누적에 영향이 크다. 동일 거리에서 질량이 낮을수록 가속·감속 에너지 손실이 줄고 움직임 반응이 빨라진다. 데이터군의 최경량·최중량을 기준으로 선형 반비례 min-max 정규화를 수행해 1–10 척도로 변환한다. 새 모델 극단치 유입 시에는 기존 점수 체계를 유지하다가 필요할 때만 갱신하는 고정 앵커 확장 정책을 적용한다.',
        constants: [
          {
            name: 'LIGHT_G',
            value: '129g',
            meaning: '최경량 앵커 (ASICS Metaspeed Sky Tokyo) → 10점',
          },
          {
            name: 'HEAVY_G',
            value: '351g',
            meaning: '최중량 앵커 (Nike Vomero Premium) → 1점',
          },
        ],
      },
    },
  },
  {
    id: 'value',
    name: '가성비',
    nameEn: 'Value',
    color: 'var(--spec-value)',
    summary:
      '가격 대비 성능. (쿠션성+반응성+안정성+내구성) ÷ 가격 비율을 전 모델 대비 정규화합니다. 경량성 미포함.',
    basis: '성능 합산 ÷ 가격 비율 정규화 → 1–10점',
    modalContent: {
      general: {
        description:
          '같은 돈으로 가장 많은 성능을 받는 신발이 10점입니다. 고가 레이싱화라도 쿠션·반응·안정·내구 합산이 가격에 비해 낮으면 점수가 낮게 나옵니다. 할인가는 반영하지 않고, 출시 정가 기준입니다.',
        impact:
          '8–10점: 훈련화·데일리화 중 가성비 최강 구간. 1–3점: 고가 레이싱화처럼 퍼포먼스 목적 신발이 주로 분포.',
      },
      expert: {
        dataSource:
          '쿠션성 + 반응성 + 안정성 + 내구성 점수 합산 ÷ 출시가(KRW) → 항상 직접 계산',
        formula:
          'ratio = (cushioning + responsiveness + stability + durability) / price\n\nVALUE_RATIO_MIN = 22 / 599000   # 앵커: adizero-pro-evo-2 → 1점\nVALUE_RATIO_MAX = 동적 보정     # top-5 경계 (--calibrate 자동 갱신)\n\nscore = clamp(round((ratio − MIN) / (MAX − MIN) × 9 + 1), 1, 10)',
        rationale:
          '가성비는 주어진 가격에서 획득하는 성능 밀도(utility-to-cost ratio)로 해석해야 하며, 쿠션성·반응성·안정성·내구성 점수의 합을 가격으로 나누어 산정한다. 각 항목은 동일 척도로 정규화되어 있어 단위 편향을 줄이고 비율 비교가 가능해진다. 상·하한은 데이터 경계를 rank-based dynamic anchor로 갱신해 극단값 민감도를 제어한다. 경량성은 독립 스펙으로 제외하고, 할인 미반영 출시가 기준을 사용해 통계적 일관성을 유지한다.',
        constants: [
          {
            name: 'VALUE_RATIO_MIN',
            value: '22 / 599,000',
            meaning: '최악 가성비 앵커 (adizero-pro-evo-2 → 1점)',
          },
          {
            name: 'VALUE_RATIO_MAX',
            value: '동적 (--calibrate 자동 갱신)',
            meaning: 'top-5 경계 midpoint → 10점 임계값',
          },
        ],
      },
    },
  },
]
