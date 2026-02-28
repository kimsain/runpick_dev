# RunPick Project

러닝화 스펙 비교 사이트. Next.js 14 SSG, 11개 브랜드 ~102개 신발.

## Commands

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드 (SSG) — 신발 수정 후 항상 확인
npm run lint     # ESLint
```

## Architecture

```
data/brands/*.json   — 신발 데이터 원본 (11개 브랜드)
scripts/             — Python 데이터 파이프라인
lib/data.ts          — 브랜드 JSON 통합 진입점
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

정규화 → 점수 계산:
```bash
python3 scripts/normalize_from_runrepeat.py --apply  # Case B: RunRepeat+RTINGS
python3 scripts/normalize_from_rtings.py --apply     # Case A: RTINGS-only
python3 scripts/normalize_from_reviews.py --apply    # Case C-리뷰: 정성 리뷰 → proposedScores (사람 검토 필요)
python3 scripts/impute_scores.py --apply             # Case C-KNN: 측정값 없음
python3 scripts/recalculate.py --apply               # weightScore + valueScore 갱신
```

단일 신발 카피 생성:
```bash
python3 scripts/write_copy.py --brand <brand> --shoe <shoe-id> --apply
```

## Data Cases

| Case | 조건 | 처리 스크립트 |
|------|------|--------------|
| A | RTINGS 데이터만 | `normalize_from_rtings.py` |
| B | RunRepeat + RTINGS | `normalize_from_runrepeat.py` |
| C-리뷰 | 실측 없음, 정성 리뷰 있음 | `normalize_from_reviews.py` → 사람 검토 후 적용 |
| C-KNN | 실측 없음, 리뷰도 부족 | `impute_scores.py` (KNN 자동) |

## Shoe confidence Levels

- `"high"` — RunRepeat/RTINGS 측정값 + 다수 리뷰
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
