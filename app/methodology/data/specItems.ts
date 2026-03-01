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
          'RunRepeat Heel/Forefoot SA(충격흡수) → RTINGS SA → 정성 리뷰 순으로 우선 적용',
        formula:
          'raw = heelSA × 0.4 + forefootSA × 0.6\nscore = clamp(round(1 + (raw − 88) / 62 × 9), 1, 10)',
        rationale:
          'forefoot SA에 60% 가중 적용 (현대 midfoot 착지 주류). 범위 88~150: 하한=adizero-adios-9 기준, 상한=max-cushion 실용 상한 (p95=149.8). 고정 앵커(ratchet rule): 새 신발이 범위를 벗어날 때만 확장. 2026-02-23 멀티에이전트 토론 합의.',
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
        dataSource: 'RunRepeat Energy Return %(ER%) → RTINGS ER% 순으로 우선 적용',
        formula:
          'avg_er = heelER × 0.4 + forefootER × 0.6\nscore = clamp(round((avg_er − 46) / 34 × 10), 1, 10)',
        rationale:
          '범위 46~80% (RESP_LO=46, RESP_RANGE_INT=34). forefoot 60% 가중 (쿠션성과 통일). RTINGS-only 데이터 사용 시 카테고리별 −1~−3 페널티 적용 (stability −3, max-cushion −3, all-rounder −2 등). 2026-02-23 재보정.',
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
      '착지 시 발이 얼마나 안정적으로 지지되는지 수치화합니다. 비틀림 저항·힐 카운터 강성·미드솔 너비와 스택 높이를 종합 평가합니다.',
    basis: 'TR/HCS/미드솔 너비 실측값 + 스택 패널티 → 1–10점',
    modalContent: {
      general: {
        description:
          '점수가 높을수록 발이 좌우로 흔들리지 않고 안정적으로 착지합니다. 발목이 약하거나 과도하게 안쪽으로 돌아가는(초과 회내) 러너에게 특히 중요한 지표입니다. 반대로 높은 스택의 맥시멀 쿠션화는 지면 감각이 줄어 불안정할 수 있어 패널티가 적용됩니다.',
        impact:
          '8–10점: 가이드 레일 느낌으로 발이 중립을 잡아줌, 장거리 후반에도 흔들림 적음. 1–3점: 발의 움직임이 자유롭지만 지지가 적어 발목 컨트롤이 필요.',
      },
      expert: {
        dataSource:
          'RunRepeat torsionalRigidity(TR, 1–5) + heelCounterStiffness(HCS, 1–5) + midsoleWidth(mm) → 스택/소프트니스 sway 패널티 → 전문가 리뷰 키워드 ±1 보정',
        formula:
          '# TR, HCS → 1–10 정규화\ntr_norm  = clamp(1 + 9 × (TR − 2) / 3, 1, 10)\nhcs_norm = clamp(1 + 9 × (HCS − 1) / 4, 1, 10)\n\n# Width: 실측 없으면 카테고리 median imputation\nmw_norm = clamp(0.4 × heel_norm + 0.6 × fore_norm, 1, 10)\n\n# Base 가중합 (3-LLM 합의 2026-03-01)\nbase = 0.30 × tr_norm + 0.30 × hcs_norm + 0.40 × mw_norm\n\n# Sway 패널티 (스택 높이 + 폼 소프트니스)\nac = max(heelAC, secondaryAC)  # 없으면 카테고리 prior\nsoft = min(1.5, max(0, (42 − ac) / 15))\nu_h = (stackHeel − 39) / 10\nu_f = (stackFore − 32) / 10\nstk = clamp(0.7 × tanh(1.5 × u_h) + 0.3 × tanh(1.5 × u_f), −0.5, 1.0)\nsway = 0.4 × soft + 1.0 × stk + 0.8 × (soft × stk)\nbase −= sway\n\n# Subcategory delta\nbase += SUBCAT_STAB_DELTA.get(subcategory, 0.0)\n# stability + TR≥4: base += 0.5 (측정 확인 보너스)\n\n# Rescale → 1–10\nintermediate = base\nscore = clamp(round(1 + 9 × (intermediate − RAW_MIN) / (RAW_MAX − RAW_MIN)), 1, 10)',
        rationale:
          'TR 30% + HCS 30% + Width 40%로 가중치 재설계. Width 누락 시 카테고리 median을 대입해 On 브랜드 등 데이터 부재 신발에 공정한 기준 적용. 스택 sway 패널티: cubic → tanh(gain=1.5)로 교체, 비대칭 bound [-0.5, 1.0] (저스택 보너스는 고스택 패널티의 50%로 제한). AC(Asker C durometer) 누락 시 카테고리별 prior 사용. 3-LLM(Claude+Codex+Gemini) 합의 2026-03-01.',
        constants: [
          {
            name: 'Base 가중치',
            value: 'TR 30% / HCS 30% / Width 40%',
            meaning: '3-LLM 합의 (2026-03-01)',
          },
          {
            name: 'STAB_TANH_GAIN',
            value: '1.5',
            meaning: '스택 sway 패널티 tanh 기울기',
          },
          {
            name: 'SUBCAT_STAB_DELTA',
            value: 'stability +1.0 / half −1.0 / full −0.5 / max-cushion −0.5',
            meaning: '카테고리별 구조적 특성 보정',
          },
          {
            name: 'Width median imputation',
            value: 'racing(77/110) speed(87/114) daily(91/115) cushion(99/119) stability(97/119)',
            meaning: '힐/포어풋 mm, width 데이터 없는 신발에 적용',
          },
          {
            name: 'STAB_RAW_MIN / MAX',
            value: '3.1867 / 9.2367',
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
      '아웃솔 두께와 마모량 실측값 기반. 오래 신어도 밑창이 얼마나 잘 버티는지 수치화합니다.',
    basis: '아웃솔 두께/마모 실측값 → 1–10점',
    modalContent: {
      general: {
        description:
          '점수가 높을수록 밑창이 오래 버티는 신발입니다. 아웃솔 고무 두께와 마모 속도를 기준으로 산정하며, 발볼·힐 패딩 내구성도 보조 지표로 반영합니다. 경량 레이싱화는 재료 특성상 낮게 나타날 수 있습니다.',
        impact:
          '8–10점: 고내구성 고무 아웃솔, 수백km 후에도 밑창 손상 적음. 1–3점: 얇은 아웃솔 또는 빠른 마모, 레이싱화 등에서 흔히 나타남.',
      },
      expert: {
        dataSource:
          'RunRepeat 아웃솔 두께(mm) + 마모량(mm) → toebox 내구성(1–5) + heel-pad 내구성(1–5) → 전문가 리뷰 키워드 보정',
        formula:
          '# 두께 + 마모 모두 있을 때\nratio = outsoleThickness / outsoleDurability\noutsole_raw = log(ratio + 1) / log(8.2) × 9 + 1\n\n# toebox·heel-pad 있으면 블렌딩\ntb_norm  = 1 + 9 × (toeboxDur − 1) / 4\nhp_norm  = 1 + 9 × (heelPadDur − 1) / 4\nblended  = 0.70 × outsole_raw + 0.20 × tb_norm + 0.10 × hp_norm\n\n# Rescale → 1–10\nscore = clamp(round(1 + 9 × (blended − RAW_MIN) / (RAW_MAX − RAW_MIN)), 1, 10)\n\n# 마모 데이터만 있을 때 (fallback)\ncapped = min(outsoleDurability, 10.0)\nscore  = clamp(round((10.0 − capped) / 10.0 × 9 + 1), 1, 10)',
        rationale:
          '로그 스케일로 수확체감 반영 (두꺼운 아웃솔이라도 한계 존재). 아웃솔 70% + toebox 20% + heel-pad 10% 블렌딩으로 전체 신발 내구성 반영. 두께 데이터 없을 때는 마모량 반비례 선형 공식으로 fallback.',
        constants: [
          { name: 'DUR_LOG_BASE', value: '8.2', meaning: '로그 스케일 밑수 (수확체감 반영)' },
          {
            name: '블렌딩 가중치',
            value: '아웃솔 70% / Toebox 20% / Heel-pad 10%',
            meaning: '2026-02-25 Codex+Gemini 합의',
          },
          {
            name: 'DUR_RAW_MIN / MAX',
            value: '3.4788 / 8.9913',
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
        dataSource: '실측 무게(g) — RunRepeat 또는 브랜드 공식 제원, 항상 직접 계산',
        formula:
          'score = clamp(round(1 + 9 × (HEAVY_G − weight_g) / (HEAVY_G − LIGHT_G)), 1, 10)\n\nLIGHT_G = 129  # ASICS Metaspeed Sky Tokyo\nHEAVY_G = 351  # Nike Vomero Premium',
        rationale:
          '고정 상수 사용 (신발 추가 시 기존 점수 불변). 선형 반비례 정규화. 기준값은 현재 데이터베이스 최경량·최중량 기준이며, ratchet rule 적용 (새 극단값 출현 시만 앵커 갱신).',
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
          '쿠션성 + 반응성 + 안정성 + 내구성 점수 합산 ÷ 출시가(KRW) — 항상 직접 계산',
        formula:
          'ratio = (cushioning + responsiveness + stability + durability) / price\n\nVALUE_RATIO_MIN = 22 / 599000   # 앵커: adizero-pro-evo-2 → 1점\nVALUE_RATIO_MAX = 동적 보정     # top-5 경계 (--calibrate 자동 갱신)\n\nscore = clamp(round((ratio − MIN) / (MAX − MIN) × 9 + 1), 1, 10)',
        rationale:
          '최하점 앵커는 가장 비싼 레이싱화(adizero-pro-evo-2, 599,000원)로 고정. 최고점(10점) 앵커는 특정 신발로 고정하지 않고 데이터베이스 내 top-5 경계 midpoint를 자동 보정 (recalculate.py --calibrate). 경량성 미포함 (독립 스펙). 할인가 미반영, 출시 정가 기준.',
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
