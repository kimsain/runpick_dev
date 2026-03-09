# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

# RunPick Project

러닝화 스펙 비교 사이트. Next.js 14 SSG, 12개 브랜드 106개 생산 신발.

구조나 운영 흐름을 건드리는 작업 전에는 `docs/PROJECT_CONTEXT.md`를 먼저 확인하고, 구조적 변경 시 함께 갱신하세요.

## Commands

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드 (SSG) — 신발 수정 후 항상 확인
npm run lint     # ESLint
```

## Architecture

```
data/brands/*.json   — 신발 데이터 원본 (12개 브랜드, { brand, shoes[] } 구조)
scripts/             — Python 데이터 파이프라인
lib/data.ts          — 브랜드 JSON 통합 진입점 (getAllShoes, getSimilarShoes 등)
lib/types.ts         — TypeScript 타입 정의
app/                 — Next.js 14 App Router (SSG)
components/          — React UI 컴포넌트
research/            — 신발별 리서치 원본 JSON
```

## Script Pipeline (신발 추가/수정 후 실행 순서)

데이터 수집 (신발 추가 시):
```bash
python3 scripts/collect_shoe.py --shoe-id <id>                    # 전체 수집 (RunRepeat+RTINGS+리뷰)
python3 scripts/fetch_runrepeat.py --fetch <url> --shoe-id <id>   # RunRepeat 단독
python3 scripts/fetch_rtings.py --fetch <url> --shoe-id <id>      # RTINGS 단독
```

정규화 → 점수 계산 (권장 순서):
```bash
python3 scripts/normalize_from_runrepeat.py --apply  # Case B: RunRepeat+RTINGS
python3 scripts/normalize_from_rtings.py --apply     # Case A: RTINGS-only
python3 scripts/normalize_from_reviews.py --apply --sync-production  # Case C-리뷰: c/r 제안 + stab/dur V3 구조화 반영
python3 scripts/impute_scores.py --apply             # Case C-KNN: 측정값 없음
python3 scripts/recalculate.py --calibrate --apply   # 앵커 재보정 + weightScore + valueScore 갱신
python3 scripts/recalculate.py --apply --only value  # 가성비만 재계산 (stability/durability raw 보호)
```

`recalculate.py` 주요 플래그:
- `--calibrate` — VALUE_RATIO_MAX, STAB_RAW_MIN/MAX, DUR_RAW_MIN/MAX를 현재 데이터 기반으로 재보정하고 `formulas.py`에 기록
- `--only weight|value|durability|stability` — 특정 점수만 계산 (나머지 raw 값 보호)
- `--apply` 단독 (no `--calibrate`) — 앵커 변경 없이 integer score만 갱신

단일 신발 카피 생성:
```bash
python3 scripts/write_copy.py --brand <brand> --shoe <shoe-id> --apply
```

## Data Cases

| Case | 조건 | 처리 스크립트 |
|------|------|--------------|
| A | RTINGS 데이터만 | `normalize_from_rtings.py` |
| B | RunRepeat + RTINGS | `normalize_from_runrepeat.py` |
| C-리뷰 | 실측 없음, 정성 리뷰 있음 | `normalize_from_reviews.py` → stab/dur는 deterministic, c/r만 LLM 또는 fallback |
| C-KNN | 실측 없음, 리뷰도 부족 | `impute_scores.py` (KNN 자동) |

## Shoe Confidence Levels

- `"very-high"` — RunRepeat AND RTINGS 모두 측정값 있음
- `"high"` — RunRepeat OR RTINGS 하나만 있어도 됨 (정성 리뷰 여부 무관)
- `"medium"` — 정성 리뷰만 (DOR/RTR/BITR)
- `"low"` — 데이터 매우 부족

## 새 브랜드 추가 시

`lib/data.ts`에 import 추가 필요:
```ts
import fooData from '../data/brands/foo.json'
// allBrandData 배열에도 추가
```

## Copy Rules (한국어)

- `shortDescription`: 12–26자, 명사구 종결 (해요체 금지)
- `description` / `pros` / `cons`: 점수 직접 언급 금지 (`8점`, `9/10` 등)
- 검증:
```bash
python3 scripts/verify_all_specs.py
```

## Gotchas

- `rawCushioning: null` → Case C-KNN → `impute_scores.py` 필요
- 스택 수치는 반올림 (39.5mm → 40mm)
- RTINGS ER%는 0–100 스케일 (0–10 아님)
- `scripts/formulas.py`가 모든 점수 공식의 단일 출처 — 여기서만 수정
- `rawStability` / `rawDurability`는 normalize 스크립트가 기록한 calibrated 값 — `recalculate --apply` (plain)으로 덮어쓰면 앵커 drift 발생. 재계산 필요 시 `--calibrate --apply` 또는 `--only value` 사용
- 현재 안정성/내구성 score version은 `durability-stability-v3`
- `normalize_from_reviews.py`는 `ANTHROPIC_API_KEY`가 없으면 기존 production/current score를 c/r fallback으로 유지하고 stab/dur만 동기화한다
- `RTINGS longRun` 커버리지는 2026-03-09 기준 52.2%라서 durability에서는 core가 아니라 modifier-only로 사용한다
