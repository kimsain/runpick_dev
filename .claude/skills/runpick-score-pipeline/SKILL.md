---
name: runpick-score-pipeline
description: Use when recalculating RunPick shoe scores after formula changes, raw data updates, or new shoes added. Covers the full normalize → impute → recalculate pipeline for all 86 shoes across 9 brands.
---

# RunPick Score Pipeline

## Overview

4단계 파이프라인으로 86개 신발의 쿠션성/반응성/안정성/내구성/무게/가치 점수를 전체 재산출한다.
`scripts/formulas.py`가 단일 진실 공급원 — 공식이 바뀌면 이 파이프라인을 돌린다.

## When to Run

- `scripts/formulas.py` 상수/공식 변경 후
- `fetch_runrepeat.py` / `fetch_rtings.py`로 새 원시 데이터 수집 후
- 새 신발을 브랜드 JSON에 추가한 후
- 브랜드 JSON의 원시 측정값을 직접 수정한 후

## Pipeline Commands (순서 준수)

```bash
# Step 1 — Case B: RunRepeat+RTINGS 둘 다 있는 신발 (~67개)
python3 scripts/normalize_from_runrepeat.py --apply

# Step 2 — Case A: RTINGS만 있는 신발 (~15개)
python3 scripts/normalize_from_rtings.py --apply

# Step 3 — Case C: 측정값 없는 신발 KNN Median imputation
python3 scripts/impute_scores.py --apply

# Step 4 — 전체: weightScore + valueScore 재산출 (86개)
python3 scripts/recalculate.py --apply
```

## Step Details

| Step | 스크립트 | 대상 | 산출 필드 |
|------|----------|------|-----------|
| 1 | normalize_from_runrepeat.py | Case B (~67개) | cushioning, responsiveness, stability, durability + raw 값 |
| 2 | normalize_from_rtings.py | Case A (~15개) | cushioning, responsiveness + stability (RTINGS TR/HCS) |
| 3 | impute_scores.py | Case C (6개) + Case A stab/dur (12개) | KNN Median으로 누락 필드 채움 |
| 4 | recalculate.py | 전체 86개 | weightScore (무게 선형), valueScore (가성비 min-max) |

## Verification

각 스텝 실행 후 출력에서 확인:

- **Step 1/2**: `변경 있는 신발: N/67개` — 0이면 이미 최신
- **Step 3**: `✓ N개 신발 데이터 업데이트 완료` — 보통 0
- **Step 4**: `변경: N개` — 0이면 전체 최신 상태

에러 없이 완료 = 성공.

## Notes

- Step 1(Case B)과 Step 2(Case A) 간에 일부 신발이 겹친다 (예: `fresh-foam-x-more-v6`, `ride-18`). 이는 정상이며 Step 2가 최종값을 덮어쓴다.
- `--apply` 없이 실행하면 dry-run(미리보기) 모드.
- `recalculate.py --calibrate`는 VALUE_RATIO 앵커가 바뀐 경우에만 실행 (formulas.py 자동 갱신).

## Anchor Shoes (공식 기준점)

| 역할 | 신발 | 값 |
|------|------|-----|
| 최경량 ws=10 | metaspeed-ray | 129g |
| 최중량 ws=1 | vomero-premium | 351g |
| 최저가치 vs=1 | adizero-pro-evo-2 | 599K |
| 최고가치 vs=10 | novablast-5 | 169K |
