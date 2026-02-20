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

### Case A: 실측 데이터 존재 (RunRepeat / RTINGS)

실측 장비로 측정된 정량 데이터가 존재하는 경우:

1. **Cushioning**: RunRepeat의 Heel SA와 Forefoot SA 값을 수집. 두 값의 가중 평균(Heel 60%, Forefoot 40%)을 계산한 뒤 0–10 스케일로 선형 정규화.
2. **Responsiveness**: RunRepeat의 Energy Return(ER%) 값을 수집. 현재 시판 러닝화의 ER% 범위(약 30–75%)를 기준으로 0–10 스케일로 선형 정규화.
3. **Stability / Durability**: 실측 데이터가 존재하면 이를 우선 적용하고, 전문가 리뷰 점수로 보정.

정규화 공식 (선형):
```
normalized = ((raw - range_min) / (range_max - range_min)) * 10
```

### Case B: 전문가 리뷰만 존재

실측 데이터가 없는 경우:

1. 각 전문가 소스의 리뷰 점수를 해당 소스의 점수 체계에서 0–10 스케일로 변환.
2. 복수 소스가 있으면 산술 평균 적용.
3. 단일 소스만 있으면 해당 점수를 그대로 사용하되 신뢰도를 `low`로 설정.

### 정성 리뷰 보정 / Qualitative Correction

실측 데이터 유무와 관계없이 Stability, Durability에 정성 리뷰 키워드 분석 결과를 ±1 보정합니다.

- **Stability +1**: stable, stiff, firm, supportive, stability 언급
- **Stability -1**: unstable, wobbly, sloppy 언급
- **Durability +1**: durable, long-lasting, holds up, outsole wear 포지티브 언급
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

- RunRepeat SA 우선 (heelSA × 0.6 + forefootSA × 0.4 — 50) / 150 × 10, clamped 0–10
- RunRepeat 없을 경우 RTINGS fallback: `0.72 × (heelScore + forefootScore) / 2`, clamped 0–10

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
- **주관성**: Stability, Durability는 전문가 리뷰에 의존하므로 리뷰어 편향이 존재할 수 있음
