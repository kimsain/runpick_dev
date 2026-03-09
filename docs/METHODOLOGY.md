# RunPick Methodology

## 개요 / Overview

RunPick의 점수 데이터는 5개 전문 소스에서 수집한 실측 데이터를 정규화·종합하여 산출합니다.
어떤 브랜드로부터도 후원을 받지 않으며, 모든 데이터는 공개된 출처에서 가져옵니다.

## 데이터 소스 / Data Sources

| 소스 | 유형 | 주요 데이터 |
|------|------|------------|
| RunRepeat | 실측 측정 | Heel/Forefoot SA (충격흡수), Energy Return ER%, Weight |
| RTINGS | 실측 + 착용 | 무게, 스택 하이트, 플랫폼 폭/비율, long-run 에너지 유지율 |
| Doctors of Running | 전문가 리뷰 | 안정성, 착지감, 주법 적합성 |
| Road Trail Run | 전문가 리뷰 | 내구성, 다목적 활용, 장거리 착용감 |
| Believe in the Run | 전문가 리뷰 | 착용감, 레이스 퍼포먼스, 가성비 |

## 4개 스펙 정의 / Spec Definitions

| 스펙 | 영문 | 산출 기준 | 범위 |
|------|------|-----------|------|
| 쿠션 | Cushioning | Heel/Forefoot Shock Attenuation (SA) | 0–10 |
| 반응 | Responsiveness | Energy Return (ER%) | 0–10 |
| 안정 | Stability | TR/HCS, 플랫폼 폭·비율, sway, 구조화 리뷰 signal 결합 | 0–10 |
| 내구 | Durability | outsole/upper core + hardness·long-run·정성 modifier | 0–10 |

## 점수 정규화 / Score Normalization

### 케이스 분기 / Case Branching

데이터 소스 수집 결과에 따라 3가지 케이스로 분기:

| 케이스 | 진입 조건 | 스크립트 |
|--------|-----------|----------|
| **Case B** | RunRepeat **found** AND RTINGS **found** | `normalize_from_runrepeat.py` |
| **Case A** | RunRepeat **not found** AND RTINGS **found** | `normalize_from_rtings.py` |
| **Case C** | RunRepeat/RTINGS 모두 없음 (정성 리뷰만) | `normalize_from_reviews.py` |

현재 안정성/내구성 score version은 `durability-stability-v3`입니다.

- 커버리지 `60% 이상`인 정량 필드는 core input으로 사용합니다.
- 커버리지 `60% 미만`인 정량 필드는 modifier-only로만 사용합니다.
- 2026-03-09 기준 merged research 커버리지:
  - RunRepeat `TR/HCS`: `92/115 = 80.0%`
  - RunRepeat `midsole width`: `75/115 = 65.2%`
  - RTINGS `outsole width`: `76/115 = 66.1%`
  - RTINGS `longRun`: `60/115 = 52.2%` → durability에서 modifier-only

---

### Case B: RunRepeat + RTINGS 둘 다 있음

RunRepeat 물리 측정값을 1차 신호로 사용. RTINGS는 신뢰도 판정에만 기여.

#### 쿠션 (Cushioning)

```
raw = heelSA × 0.4 + forefootSA × 0.6
CUSH_MIN_SA = 88   # adizero-adios-9 기준 (ratchet rule)
CUSH_MAX_SA = 150  # max-cushion 실용 상한 (p95=149.8 근거)
cushioning = clamp(round(1 + 9 × (raw - CUSH_MIN_SA) / (CUSH_MAX_SA - CUSH_MIN_SA)), 1, 10)
```

**설계 근거 (2026-02-23 재보정):**
- **가중치 heel 40% / forefoot 60%**: 현대 러닝 기술에서 forefoot/midfoot 착지가 주류. forefoot SA가 실제 달리기 체감 쿠션에 더 직결됨.
- **범위 88~150**: 하한 88 = adizero-adios-9 기준 (실측 최솟값), 상한 150 = max-cushion 실용 상한 (p95=149.8).
- **선형 정규화**: SA 값은 균등 분포에 가까워 log 압축 불필요.
- **분모 62**: 상한(150) − 하한(88) = 62.

#### 반응 (Responsiveness)

```
avg_er = heelEnergyReturn × 0.4 + forefootEnergyReturn × 0.6
RESP_LO = 46    # ER% 하한 (ratchet) — 이하 = 1점
RESP_HI = 80    # ER% 상한 (RESP_LO + 34)
responsiveness = clamp(round((avg_er - RESP_LO) / (RESP_HI - RESP_LO) × 10), 1, 10)
```

**설계 근거 (2026-02-23 멀티에이전트 토론 합의 v3):**
- **하한 46%**: ghost-max-3(50.8%)·gel-nimbus-28(45.2%) 최하위군, 1점 경계 ~51.1%. 기존 40%는 실데이터 범위 밖 데드존 유발.
- **상한 80% (46+34)**: avg ER% ≥78.3% → 10점. 분모 34 = 80 − 46.
- **forefoot 60% 가중**: 달리기에서 toe-off phase의 전족부 반응성이 체감 탄성을 더 잘 대표. 쿠션성(40/60)과 동일 가중치로 측정 일관성 확보.
- **선형**: ER%는 물리적 에너지 보존율로 지각과 선형 관계.
- **rawResponsiveness도 같은 하한/범위(`RESP_LO = 46`, `RESP_RANGE_INT = 34`)를 사용합니다.**
- **측정 한계**: ER%는 플레이트 강성, 로커 형상, 스택 높이 비선형성을 반영하지 못함. 대안 지표 부재로 유지하되 한계 인지 필요.
- → 토론 레코드: `docs/RESPONSIVENESS_DEBATE_2026-02-23.md`

#### 안정 (Stability)

```
structure = 0.55 × TR_norm + 0.45 × HCS_norm
platform  = weighted_mean(RR midsole 45%, RT outsole 35%, RT ratio 20%)
core      = weighted_mean(structure 55%, platform 45%)

raw = core_or_5.5
    + SUBCAT_STAB_DELTA
    - swayPenalty(stack + softness)
    + qualitativeModifier

score = clamp(round(1 + 9 × (raw − 2.4419) / (9.3481 − 2.4419)), 1, 10)
```

**설계 근거 (V3, 2026-03-09 rollout):**
- structure는 RunRepeat `torsionalRigidity`와 `heelCounterStiffness`를 55/45로 결합합니다.
- platform은 RunRepeat `midsoleWidth`, RTINGS `outsole width`, RTINGS `width-to-stack ratio`를 결합합니다.
- sway 패널티 입력 우선순위는 `RunRepeat physical stack → RTINGS physical stack → production stack`이며, softness는 `RunRepeat AC → RTINGS firmness proxy → subcategory prior` 순서입니다.
- 정성 보정은 자유 텍스트 ±1이 아니라 source share 기반입니다.
  - `+0.30 lockdown +0.35 guidance/sidewall +0.20 wide_base −0.45 heel_slip −0.60 instability`
  - cap `±1.25 raw`
- `SUBCAT_STAB_DELTA`는 카테고리 구조 편향을 보정합니다.
- stack source 우선순위 drift는 현재 `0건`입니다.

#### 내구 (Durability)

```
outsole = log(outsoleThickness / abrasion + 1) / log(8.2) × 9 + 1
upper   = 0.60 × toebox_norm + 0.40 × heelPad_norm

midsoleLongevityScore    = normalize(retentionRatio, 0.90 → 1점, 0.98 → 10점)
midsoleLongevityModifier = capped((midsoleLongevityScore − 5.5) / 4.5, ±1.0)
compoundModifier         = outsoleHardness_hc 기반 bounded raw modifier
qualitativeModifier      = durability signal share 기반 bounded raw modifier

raw = core_or_5.5 + midsoleLongevityModifier + compoundModifier + qualitativeModifier
score = clamp(round(1 + 9 × (raw − 3.6575) / (9.3335 − 3.6575)), 1, 10)
```

**설계 근거 (V3, 2026-03-09 rollout):**
- outsole과 upper를 core로 두고, hardness와 정성 signal을 raw modifier로 더합니다.
- RunRepeat `outsoleHardness_hc`는 compound modifier만 담당합니다.
- RTINGS `longRun`은 retention ratio로 계산하지만 현재 커버리지가 `52.2%`라서 core가 아니라 modifier-only입니다.
- 정성 보정은 자유 텍스트 ±1이 아니라 source share 기반입니다.
  - `+0.30 coverage +0.25 reinforcement +0.15 durable −0.45 early_wear −0.35 exposed_foam −0.35 midsole_breakdown`
  - cap `±1.5 raw`
- core가 하나도 없으면 neutral prior `5.5`에서 시작합니다.

---

### Case A: RTINGS만 있음

RunRepeat 데이터 없음. RTINGS 0~10 스케일 점수를 기반으로 정규화.

#### 쿠션 (Cushioning)

```
avg = heelSA × 0.4 + forefootSA × 0.6
RTINGS_CUSH_MIN = 4.5  # 고정 앵커
RTINGS_CUSH_MAX = 9.6  # 고정 앵커
cushioning = clamp(round(1 + 9 × (avg - RTINGS_CUSH_MIN) / (RTINGS_CUSH_MAX - RTINGS_CUSH_MIN)), 1, 10)
```

**설계 근거 (2026-02-23 재보정):**
- RunRepeat Case B와 동일하게 40/60 가중, 앵커 기반 min-max 정규화 (4.5~9.6). RTINGS 편향 보정은 앵커가 흡수.
- 기존 단순 평균 + 0.675 계수 방식 폐기 (min-max 앵커가 편향을 직접 흡수하므로 별도 계수 불필요).

#### 반응 (Responsiveness)

```
avg_er = (heelEnergyReturn + forefootEnergyReturn) / 2
responsiveness = clamp(round(avg_er / 10) + penalty_by_subcat, 1, 10)
```

카테고리별 페널티 (2026-02-23 재보정):

| 카테고리 | 페널티 | 근거 |
|----------|--------|------|
| stability | -3 | avg bias +2.29 (n=7) |
| max-cushion | -3 | avg bias +1.56 (n=9) |
| all-rounder | -2 | avg bias +2.2 (n=5) |
| entry | -2 | avg bias +2.0 (n=1) |
| lightweight | -1 | 방향성 혼재 (underpredicts도 존재) |
| no-plate | -1 | avg bias +0.8 (n=5) |
| light-plate | -2 | avg bias +1.5 (n=8) |
| full / half / carbon-plate (racing) | 0 | 편향 ≈ 0 |

**설계 근거 (2026-02-23 재보정):**
- RTINGS ER% 점수는 0~10 스케일 → 10 나누면 바로 정규화.
- **카테고리 페널티**: RTINGS가 두꺼운 폼의 재료 탄성(정적 드롭 테스트)을 측정하는 반면 RunRepeat는 동적 달리기 조건 ER%를 측정. 이 방법론 차이로 max-cushion/stability에서 체계적 상향 편향 발생.
- 페널티 상수는 `formulas.py`의 `RESP_PENALTY_BY_SUBCAT`에 정의.
- racing 계열: 편향 ≈ 0 → 보정 없음.
- **구조적 한계**: gel-nimbus-28, gel-kayano-32 같은 극단적 max-cushion/stability는 방법론 불일치로 MaxAE ≤1.5 달성 불가. 이를 인지하되 현 데이터 소스 체계에서 수용.

#### 안정 (Stability)

```
platform = weighted_mean(RTINGS outsole width, RTINGS width-to-stack)
raw = platform_or_5.5 + SUBCAT_STAB_DELTA − swayPenalty + qualitativeModifier
score = clamp(round(1 + 9 × (raw − 2.4419) / (9.3481 − 2.4419)), 1, 10)
```

**설계 근거:**
- V3부터 Case A는 더 이상 `8/6` 휴리스틱을 쓰지 않습니다.
- RTINGS platform 계열과 sway, qualitative share modifier만으로 stability를 계산합니다.

#### 내구 (Durability)

```
midsoleLongevityScore    = normalize(retentionRatio, 0.90 → 1점, 0.98 → 10점)
midsoleLongevityModifier = capped((score − 5.5) / 4.5, ±1.0)
raw = 5.5 + midsoleLongevityModifier + qualitativeModifier
score = clamp(round(1 + 9 × (raw − 3.6575) / (9.3335 − 3.6575)), 1, 10)
```

**설계 근거:**
- V3부터 Case A는 더 이상 `기존값 ±1`을 쓰지 않습니다.
- RTINGS long-run retention과 structured qualitative durability signal로 durability를 계산합니다.
- longRun은 현재 coverage policy 때문에 modifier-only입니다.

---

### Case C: 정성 리뷰만 있음

RunRepeat/RTINGS 모두 없음. `normalize_from_reviews.py`를 사용합니다.

- `cushioning`, `responsiveness`: Claude API가 제안합니다.
- `stability`, `durability`: LLM이 직접 점수를 찍지 않고 structured signal rubric으로 계산합니다.
- `--apply --sync-production` 실행 시 research `proposedScores`와 production JSON을 함께 갱신합니다.
- Anthropic 인증이 없으면 기존 production/current score를 `c/r` fallback으로 유지하고, stability/durability만 deterministic하게 동기화합니다.

---

### 경량성 (weightScore)

케이스 분기와 무관하게 항상 실측 무게(g)로 직접 계산합니다.

```
weightScore = clamp(round((HEAVY_G - weight) / (HEAVY_G - LIGHT_G) × 10), 1, 10)
  LIGHT_G = 129  (최경량 기준: metaspeed-ray)
  HEAVY_G = 351  (최중량 기준: vomero-premium)
```

**설계 근거:**
- **고정 상수**: 동적 min/max 대신 현 데이터셋 실측 최솟값(129g)과 최댓값(351g)을 고정 기준으로 사용. 신발 추가 시 기존 점수가 변하지 않음.
- **선형 반비례**: 무게와 경량성 체감은 선형 관계. 별도 압축 불필요.
- **clamp(1, 10)**: 다른 스펙과 동일하게 최솟값 1점 보장. 351g 이상은 1점으로 수렴.
- **스크립트**: `recalculate.py --only weight --apply` 로 재계산.

---

### 가성비 (valueScore)

케이스 분기와 무관하게 항상 4개 스펙 합산 / 가격으로 직접 계산합니다.

```
ratio = (cushioning + responsiveness + stability + durability) / price
VALUE_RATIO_MIN = 22 / 599_000  # 앵커 최솟값: adizero-pro-evo-2 (sum=22, price=599,000)
VALUE_RATIO_MAX = 0.0001638934  # top-5 경계 (2026-03-09 calibrate)
valueScore = clamp(round((ratio − VALUE_RATIO_MIN) / (VALUE_RATIO_MAX − VALUE_RATIO_MIN) × 9 + 1), 1, 10)
```

**설계 근거:**
- **4개 스펙 합산 / 가격**: 단위 가격당 성능 비율. 스펙이 높고 가격이 낮을수록 가성비 높음.
- **rank-based dynamic anchor**: 최솟값은 고정(`adizero-pro-evo-2`), 최댓값은 top-5 경계로 `recalculate.py --calibrate --apply` 때 갱신합니다.
  - 앵커 최솟값(1점): adizero-pro-evo-2 — sum=22, price=599,000원
  - 앵커 최댓값(10점): 현재 `0.0001638934`
- **가격 기준**: 출시 MSRP (KRW). 할인가 미반영.
- **weightScore 미포함**: 경량성은 별도 스펙으로 표시되며, 가성비 판단 기준은 핵심 퍼포먼스 4개로 한정.
- **clamp(1, 10)**: 다른 스펙과 동일하게 최솟값 1점 보장.
- **스크립트**: `recalculate.py --only value --apply` 로 재계산.

---

### 정성 리뷰 보정 / Qualitative Correction

V3에서는 자유 텍스트 ±1 보정 대신, `keyFindings`를 deterministic extractor로 구조화해 source share modifier를 계산합니다.

- Stability signals:
  - `lockdown`, `guidance_sidewall`, `wide_base`, `heel_slip`, `instability`
- Durability signals:
  - `outsole_coverage`, `upper_reinforcement`, `durable`, `early_wear`, `exposed_foam`, `midsole_breakdown`
- 이 구조화 결과는 research JSON의 `derivedSignals`와 production JSON의 `stabilityComponents` / `durabilityComponents`에 남습니다.

## 신뢰도 등급 / Confidence Levels

각 신발의 데이터 출처 수와 실측 데이터 유무에 따라 4단계로 구분:

| 등급 | 영문 | 기준 |
|------|------|------|
| 최고 신뢰 | `very-high` | RunRepeat found AND RTINGS found |
| 검증됨 | `high` | RunRepeat OR RTINGS found |
| 참고용 | `medium` | RunRepeat/RTINGS 모두 없음 AND 정성 리뷰 2개 이상 found/partial |
| 평가중 | `low` | 그 외 |

### 데이터 타입

```typescript
// lib/types.ts
confidence?: 'very-high' | 'high' | 'medium' | 'low'
```

## 스크립트 사용법 / Script Usage

### add_confidence.py

레거시 스크립트입니다. `research/2026-02-18/checkpoint.json` 고정 경로를 사용하므로 현재 운영 워크플로우의 기준 스크립트로 사용하지 않습니다.

```bash
cd /path/to/runpick
python3 scripts/add_confidence.py
```

**동작 방식:**
1. `checkpoint.json`의 `completed` 맵에서 `"brandId/slug"` → `confidence` 매핑을 읽음
2. `data/brands/*.json`의 각 신발 객체에 `confidence` 필드를 추가/업데이트
3. 매핑에 없는 신발은 기본값 `"low"` 적용

현재 운영 기준:
- production `confidence`는 실제 `sources` 조합과 최신 수집 결과에 맞게 함께 갱신해야 합니다.
- 새 RunRepeat/RTINGS 소스가 추가될 때는 해당 신발의 `confidence`도 같이 검토하세요.

## 디렉토리 구조 / Directory Structure

```
data/brands/
  nike.json
  adidas.json
  asics.json
  brooks.json
  hoka.json
  mizuno.json
  new-balance.json
  puma.json
  saucony.json

research/
  2026-02-18/
    checkpoint.json      # 수집 현황 및 confidence 매핑

scripts/
  add_confidence.py      # confidence 주입 스크립트
```

## raw 정밀 점수 / Raw Precision Scores

홈페이지 추천 섹션("최고의 쿠션성", "최고의 에너지리턴")은 정수 스펙(0–10) 대신
**소수점 2자리** 정밀 점수(`rawCushioning`, `rawResponsiveness`)로 정렬합니다.
이는 정수 동점으로 인해 가성비(valueScore)가 순위를 결정하는 부작용을 방지하기 위함입니다.

### 공식 / Formulas

**rawCushioning**

- RunRepeat SA 우선: `(heelSA × 0.4 + forefootSA × 0.6 − 88) / 62 × 9 + 1`, clamped 0–10
- RunRepeat 없을 경우 RTINGS fallback: `(heelSA × 0.4 + forefootSA × 0.6 − 4.5) / 5.1 × 9 + 1`, clamped 0–10

**rawResponsiveness**

- RunRepeat ER% 우선: `(heelER × 0.4 + forefootER × 0.6 − 46) / 34 × 10`, clamped 0–10  (정수 점수와 동일 앵커)
- RTINGS fallback: `(heelScore + forefootScore) / 2 / 10`, clamped 0–10

### RTINGS 쿠션 편향 분석 / RTINGS Cushioning Bias

RTINGS-only 신발(RunRepeat 데이터 없음)의 `rawCushioning`이 RunRepeat 기반 신발보다
평균 **+2.2** 높게 산출되는 편향이 관측되었습니다 (n=78, 2026-02 기준).

- 원인: RTINGS /10 점수(착용감 중심)가 RunRepeat SA 물리 측정값보다 상위권에 집중되는 경향
- 보정: 선형 계수 **0.72** 적용 (LOOCV RMSE 0.495 → **0.374**, 약 23% 개선)

### ER% 정규화 앵커 변경 근거 / ER% Normalization Anchors (2026-02-23 업데이트)

| 파라미터 | 이전 값 | 현행 값 | 근거 |
|---------|---------|---------|------|
| `RESP_LO` (하한) | 30% | **46%** | 실측 하위권 기반 ratchet |
| 정수/RAW 범위 (`RESP_RANGE_INT`) | 52 (=82−30) | **34** (=80−46) | 정수/RAW 모두 동일 범위 사용 |
| heel/forefoot 가중치 | 50/50 | **40/60** | 전족부 반응성 체감 우세 + 쿠션성과 통일 |

기존 상한 75% 기준에서는 레이싱화 15개 전부 `rawResp = 10.0`이 되어
타이브레이커인 valueScore(가성비)가 순위를 결정, 고가 레이싱화가 불이익을 받았습니다.

## 점수 재설계 프로세스 / Score Redesign Process

공식 변경이 필요한 경우 `docs/SCORE_DEBATE_PLAYBOOK.md` 절차에 따른다 (멀티 에이전트 토론 → 합의 기준 7개 검증 → 버저닝 → 적용).

---

## 한계 / Limitations

- **발 형태 차이**: 동일 점수라도 발 형태, 체중, 주법에 따라 체감이 다를 수 있음
- **컬러웨이 차이**: 같은 모델이라도 컬러웨이에 따라 무게·핏이 미세하게 다름
- **출시 직후 한계**: 신제품은 전문가 리뷰가 충분하지 않아 신뢰도가 낮을 수 있음
- **업데이트 주기**: 점수는 새로운 데이터가 수집될 때마다 수동 업데이트
- **주관성**: Stability, Durability는 RunRepeat 실측 데이터(torsionalRigidity, heelCounterStiffness, outsoleDurability) 기반이나, 데이터 없는 경우 전문가 리뷰 키워드에 의존하므로 리뷰어 편향이 존재할 수 있음
