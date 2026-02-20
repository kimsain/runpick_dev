# RunPick Methodology

## 개요 / Overview

RunPick의 점수 데이터는 5개 전문 소스에서 수집한 실측 데이터를 정규화·종합하여 산출합니다.
어떤 브랜드로부터도 후원을 받지 않으며, 모든 데이터는 공개된 출처에서 가져옵니다.

## 데이터 소스 / Data Sources

| 소스 | 유형 | 주요 데이터 |
|------|------|------------|
| RunRepeat | 실측 측정 | Heel/Forefoot SA (충격흡수), Energy Return ER%, Weight |
| RTINGS | 실측 + 착용 | 무게, 스택 하이트, 착용 테스트, 아웃솔 내구성 |
| Doctors of Running | 전문가 리뷰 | 안정성, 착지감, 주법 적합성 |
| Road Trail Run | 전문가 리뷰 | 내구성, 다목적 활용, 장거리 착용감 |
| Believe in the Run | 전문가 리뷰 | 착용감, 레이스 퍼포먼스, 가성비 |

## 4개 스펙 정의 / Spec Definitions

| 스펙 | 영문 | 산출 기준 | 범위 |
|------|------|-----------|------|
| 쿠션 | Cushioning | Heel/Forefoot Shock Attenuation (SA) | 0–10 |
| 반응 | Responsiveness | Energy Return (ER%) | 0–10 |
| 안정 | Stability | 전문가 리뷰 종합 평가 | 0–10 |
| 내구 | Durability | 아웃솔 마모, 미드솔 변형 등 종합 | 0–10 |

## 점수 정규화 / Score Normalization

### 케이스 분기 / Case Branching

데이터 소스 수집 결과에 따라 3가지 케이스로 분기:

| 케이스 | 진입 조건 | 스크립트 |
|--------|-----------|----------|
| **Case B** | RunRepeat **found** AND RTINGS **found** | `normalize_from_runrepeat.py` |
| **Case A** | RunRepeat **not found** AND RTINGS **found** | `normalize_from_rtings.py` |
| **Case C** | RunRepeat/RTINGS 모두 없음 (정성 리뷰만) | `normalize_from_reviews.py` |

---

### Case B: RunRepeat + RTINGS 둘 다 있음

RunRepeat 물리 측정값을 1차 신호로 사용. RTINGS는 신뢰도 판정에만 기여.

#### 쿠션 (Cushioning)

```
raw = heelSA × 0.4 + forefootSA × 0.6
cushioning = clamp(round((raw - 50) / 104 × 10), 1, 10)
```

**설계 근거:**
- **가중치 heel 40% / forefoot 60%**: 현대 러닝 기술에서 forefoot/midfoot 착지가 주류. forefoot SA가 실제 달리기 체감 쿠션에 더 직결됨.
- **범위 50~154**: RunRepeat 데이터 전수 조사 결과 현실적인 SA 범위. 하한 50 = 최경량 레이싱화(거의 쿠션 없음), 상한 154 = 최고 쿠션 맥스쿠션화.
- **선형 정규화**: SA 값은 균등 분포에 가까워 log 압축 불필요.
- **분모 104**: 상한(154) − 하한(50) = 104.

#### 반응 (Responsiveness)

```
avg_er = (heelEnergyReturn + forefootEnergyReturn) / 2
responsiveness = clamp(round((avg_er - 30) / 52 × 10), 1, 10)
```

**설계 근거:**
- **하한 30%**: RunRepeat 전수 데이터 기준 최저 ER%. 맥스쿠션·안정화의 최솟값.
- **상한 82%**: 실측 최고 ER%를 기록한 레이싱화 상위 4~5% 기준. 82% 이상은 사실상 없음.
- **선형**: ER%는 물리적 에너지 보존율로 지각과 선형 관계.
- **분모 52**: 상한(82) − 하한(30) = 52.
- **rawResponsiveness 상한은 85%로 분리**: 정수 점수 상한 82%에선 레이싱화 여럿이 동점 10점. 추천 정렬용 소수점 점수에선 85%로 높여 상위 2~4개만 10점 부근, 나머지 레이싱화 간 변별 유지. (→ [raw 정밀 점수](#raw-정밀-점수--raw-precision-scores) 참조)

#### 안정 (Stability)

```
stability = clamp(round(torsionalRigidity + heelCounterStiffness), 1, 10)
```

Fallback (RunRepeat 미수집):
```
stability = clamp(기존값 + keyword_delta, 1, 10)
```

**설계 근거:**
- **두 항목 합산**: torsionalRigidity(비틀림 강성)는 발의 내외 회전 안정을, heelCounterStiffness(힐카운터 강성)는 뒤꿈치 고정력을 독립적으로 측정. 두 요소가 안정성에 동등하게 기여하므로 가중치 없이 합산.
- **RunRepeat /5 스케일**: 각 항목이 0~5 범위 → 합산 0~10이 되어 별도 정규화 불필요.
- **Fallback**: 기존 스펙 + 키워드 delta. 정성 리뷰에서 stable/supportive → +1, unstable/wobbly 등 → -1.

#### 내구 (Durability)

두께 + 마모 데이터 모두 있을 때:
```
ratio = outsoleThickness_mm / outsoleDurability_mm
durability = clamp(round(log(ratio + 1) / log(8.2) × 9 + 1), 1, 10)
```

두께 데이터 없고 마모 데이터만 있을 때:
```
capped = min(outsoleDurability_mm, 10.0)
durability = clamp(round((10.0 - capped) / 10.0 × 9 + 1), 1, 10)
```

**설계 근거:**
- **ratio 개념**: 마모 속도(abr) 대비 남은 재료(thick). 두꺼워도 무른 고무면 빨리 닳고, 얇아도 단단하면 오래 감. ratio 하나로 두 변수를 통합.
- **로그 스케일**: 내구성의 체감은 비선형. ratio 1→2 개선(얇은 신발이 조금 두꺼워짐)은 수명을 크게 늘리지만, ratio 10→20(이미 충분히 두꺼운 신발이 더 두꺼워짐)은 체감 차이가 거의 없음. log로 수확체감 반영.
- **+1 오프셋 (log(ratio+1))**: ratio=0일 때 log(0) 방지. 극단적 마모를 1점으로 수렴시킴.
- **log(8.2) 분모 캘리브레이션**: ratio=6.43(gel-kayano-32)이 정확히 10점이 되도록 역산. 상위 4개 신발(tempus-2, glycerin-22, arahi-8, gel-kayano-32)이 모두 10점을 받는 것이 직관적으로 타당한 분포.

  실증 분포:
  | ratio | 점수 | 예시 |
  |-------|------|------|
  | ≥ 6.43 | 10 | tempus-2, glycerin-22, arahi-8, gel-kayano-32 |
  | 5.0–6.4 | 9 | superblast-2, ghost-17 |
  | 3.0–5.0 | 8 | bondi-9, clifton-10 |
  | 2.0–3.0 | 6–7 | endorphin-elite-2 |
  | 0.5–1.5 | 4–5 | wave-sky-9 |
  | < 0.5 | 1–3 | alphafly-3, vaporfly-4, adizero-pro-evo-2 |

- **fallback (두께 없음)**: 마모 데이터만 있으면 선형 반비례. abr=0 → 10점, abr=10mm 이상 → 1점.

---

### Case A: RTINGS만 있음

RunRepeat 데이터 없음. RTINGS 0~10 스케일 점수를 기반으로 정규화.

#### 쿠션 (Cushioning)

```
cushioning = round((heelShockAbsorption + forefootShockAbsorption) / 2)
```

**설계 근거:**
- RTINGS는 이미 0~10 스케일로 보고하므로 추가 정규화 불필요.
- 단순 평균: heel과 forefoot을 동등 취급 (RTINGS는 RunRepeat과 달리 물리 단위 아닌 점수).
- **rawCushioning에는 0.675 계수 추가**: RTINGS-only 신발이 RunRepeat 기반 신발보다 평균 +2.2pt 높게 나오는 편향 관측 (n=78, 2026-02). LOOCV RMSE 0.495 → 0.374(23% 개선). 정수 스펙은 반올림으로 어느 정도 상쇄되지만 정렬용 소수점 점수에선 필수 보정. (→ [RTINGS 쿠션 편향 분석](#rtings-쿠션-편향-분석--rtings-cushioning-bias) 참조)

#### 반응 (Responsiveness)

```
avg_er = (heelEnergyReturn + forefootEnergyReturn) / 2
responsiveness = clamp(round(avg_er / 10) + penalty_by_subcat, 1, 10)
```

카테고리별 페널티:

| 카테고리 | 페널티 | 근거 |
|----------|--------|------|
| stability | -2 | 평균 편향 +1.86 |
| max-cushion | -2 | 평균 편향 +1.1 (−1 후에도 여전히 높음) |
| all-rounder | -1 | 평균 편향 +1.8 |
| entry | -1 | 평균 편향 +2 |
| lightweight | -1 | 평균 편향 +1 |
| no-plate | -1 | 평균 편향 +0.7~1 |
| light-plate | -1 | 평균 편향 +0.4~1 |
| full / half / carbon-plate (racing) | 0 | 편향 ≈ 0 |

**설계 근거:**
- RTINGS ER% 점수는 0~10 스케일 → 10 나누면 바로 정규화.
- **카테고리 페널티**: RTINGS 점수가 RunRepeat 캘리브레이션 대비 카테고리별로 체계적 상향 편향. 페널티 값은 `calibrate_rtings.py` 실행 결과에서 도출. 페널티 상수는 `formulas.py`의 `RESP_PENALTY_BY_SUBCAT`에 정의.
- racing 계열: 편향 ≈ 0 → 보정 없음.

#### 안정 (Stability)

```
stability = 8 if subcategoryId == "stability" else 6
if stable/supportive keyword in findings:
    stability = clamp(stability + 1, 1, 10)
```

**설계 근거:**
- RTINGS는 안정성을 직접 수치 측정하지 않음 → 카테고리 휴리스틱이 최선.
- **기본값 8 (stability 카테고리)**: 안정화는 설계 자체가 안정성 우선이지만, 최고 강성 보조기기가 아닌 이상 10을 부여하기 어려움. 8 = "상당히 안정적이나 최대치 아님".
- **기본값 6 (그 외)**: 중립화는 의도적으로 안정성을 낮추거나 중립 유지. 5가 순수 중립이나 현행 데이터 기반 실측 평균이 6에 가까워 6으로 설정.
- **+1 키워드 보정**: 전문가 리뷰에서 명시적 언급이 있을 때만 가산.

#### 내구 (Durability)

```
durability = clamp(기존값 + keyword_delta, 1, 10)
```

**설계 근거:**
- RTINGS는 아웃솔 마모를 대부분 측정하지 않아 정성 리뷰 키워드가 유일한 신호.

---

### Case C: 정성 리뷰만 있음

RunRepeat/RTINGS 모두 없음. Claude API 추론(`normalize_from_reviews.py`) 사용.

1. 각 전문가 소스의 리뷰 점수를 해당 소스의 점수 체계에서 0–10 스케일로 변환.
2. 복수 소스가 있으면 산술 평균 적용.
3. 단일 소스만 있으면 해당 점수를 그대로 사용하되 신뢰도를 `low`로 설정.

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
valueScore = clamp(round((cushioning + responsiveness + stability + durability) / price × 48000), 1, 10)
```

**설계 근거:**
- **4개 스펙 합산 / 가격**: 단위 가격당 성능 비율. 스펙이 높고 가격이 낮을수록 가성비 높음.
- **scale 48000**: 현 데이터셋 역산 최적값 (MAE 0.581). 앵커 예시: 스펙합 28, 가격 192K원 → valueScore ≈ 7.
- **가격 기준**: 출시 MSRP (KRW). 할인가 미반영.
- **weightScore 미포함**: 경량성은 별도 스펙으로 표시되며, 가성비 판단 기준은 핵심 퍼포먼스 4개로 한정.
- **clamp(1, 10)**: 다른 스펙과 동일하게 최솟값 1점 보장.
- **스크립트**: `recalculate.py --only value --apply` 로 재계산.

---

### 정성 리뷰 보정 / Qualitative Correction

케이스와 관계없이 Stability, Durability에 정성 리뷰 키워드 분석 결과를 ±1 보정합니다.

- **Stability +1**: stable, supportive 언급
- **Stability -1**: unstable, wobbly, sloppy, less stable, not stable, lacks stability 언급
- **Durability +1**: durable, long-lasting, holds up, durable outsole 언급
- **Durability -1**: wears fast, breaks down, poor durability 언급

## 신뢰도 등급 / Confidence Levels

각 신발의 데이터 출처 수와 실측 데이터 유무에 따라 4단계로 구분:

| 등급 | 영문 | 기준 |
|------|------|------|
| 최고 신뢰 | `very-high` | RunRepeat found AND RTINGS found |
| 검증됨 | `high` | (RunRepeat OR RTINGS) found AND 정성 리뷰 1개 이상 found/partial |
| 참고용 | `medium` | RunRepeat/RTINGS 모두 없음 AND 정성 리뷰 2개 이상 found/partial |
| 평가중 | `low` | 그 외 (정성 리뷰 1개 이하) |

### 데이터 타입

```typescript
// lib/types.ts
confidence?: 'very-high' | 'high' | 'medium' | 'low'
```

## 스크립트 사용법 / Script Usage

### add_confidence.py

`research/2026-02-18/checkpoint.json`의 confidence 값을 각 브랜드 JSON 파일(`data/brands/*.json`)에 주입합니다.

```bash
cd /path/to/runpick
python3 scripts/add_confidence.py
```

**동작 방식:**
1. `checkpoint.json`의 `completed` 맵에서 `"brandId/slug"` → `confidence` 매핑을 읽음
2. `data/brands/*.json`의 각 신발 객체에 `confidence` 필드를 추가/업데이트
3. 매핑에 없는 신발은 기본값 `"low"` 적용

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

- RunRepeat SA 우선: `(heelSA × 0.4 + forefootSA × 0.6 − 50) / 104 × 10`, clamped 0–10
- RunRepeat 없을 경우 RTINGS fallback: `0.675 × (heelScore + forefootScore) / 2`, clamped 0–10

**rawResponsiveness**

- RunRepeat ER% 우선: `(avg_ER − 30) / 55 × 10`, clamped 0–10  (정규화 상한 85%)
- RTINGS fallback: `(heelScore + forefootScore) / 2 / 10`, clamped 0–10

### RTINGS 쿠션 편향 분석 / RTINGS Cushioning Bias

RTINGS-only 신발(RunRepeat 데이터 없음)의 `rawCushioning`이 RunRepeat 기반 신발보다
평균 **+2.2** 높게 산출되는 편향이 관측되었습니다 (n=78, 2026-02 기준).

- 원인: RTINGS /10 점수(착용감 중심)가 RunRepeat SA 물리 측정값보다 상위권에 집중되는 경향
- 보정: 선형 계수 **0.72** 적용 (LOOCV RMSE 0.495 → **0.374**, 약 23% 개선)

### ER% 정규화 상한 변경 근거 / ER% Normalization Upper Bound

| 용도 | 기존 상한 | 변경 후 | 근거 |
|------|----------|---------|------|
| rawResponsiveness (추천 정렬) | 75% | **85%** | 실측 최고 81.5% 기준, 10점 = 상위 2–4개 수준 |
| 표시 정수 responsiveness (스펙 바) | 75% | **82%** | 상위 4–5% 신발만 10점 |

기존 상한 75% 기준에서는 레이싱화 15개 전부 `rawResp = 10.0`이 되어
타이브레이커인 valueScore(가성비)가 순위를 결정, 고가 레이싱화가 불이익을 받았습니다.

## 한계 / Limitations

- **발 형태 차이**: 동일 점수라도 발 형태, 체중, 주법에 따라 체감이 다를 수 있음
- **컬러웨이 차이**: 같은 모델이라도 컬러웨이에 따라 무게·핏이 미세하게 다름
- **출시 직후 한계**: 신제품은 전문가 리뷰가 충분하지 않아 신뢰도가 낮을 수 있음
- **업데이트 주기**: 점수는 새로운 데이터가 수집될 때마다 수동 업데이트
- **주관성**: Stability, Durability는 RunRepeat 실측 데이터(torsionalRigidity, heelCounterStiffness, outsoleDurability) 기반이나, 데이터 없는 경우 전문가 리뷰 키워드에 의존하므로 리뷰어 편향이 존재할 수 있음
