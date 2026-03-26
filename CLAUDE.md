# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# RunPick Project

러닝화 스펙 비교 사이트. Next.js 14 SSG, 12개 브랜드 ~102개 신발.

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
lib/types.ts         — TypeScript 타입 정의 (Shoe, Brand, Specs, FilterState 등)
lib/constants.ts     — CATEGORY_LABELS, SPEC_LABELS, SOURCE_LABELS
lib/confidence.ts    — confidence 레벨별 색상·뱃지·툴팁 토큰 (단일 소스)
lib/shoeSearch.ts    — 검색 랭킹 로직 + localStorage 최근 검색어
lib/scoreMethodNotice.ts — 점수 방법론 면책 문구
lib/motion.ts        — Framer Motion 공유 variants/easing (fadeUpVariants, staggerContainer, EASE_OUT_QUART)
app/                 — Next.js 14 App Router (SSG)
components/          — React UI 컴포넌트
research/            — 신발별 리서치 원본 JSON
```

### App Routes

| Route | 파일 | 특이사항 |
|-------|------|---------|
| `/` | `app/page.tsx` | SSG. 카테고리별 top-4 추천 (rawScore 정렬) |
| `/shoes` | `app/shoes/page.tsx` | SSG 렌더 → `ShoesBrowser` (client) |
| `/shoes/[slug]` | `app/shoes/[slug]/page.tsx` | SSG (`generateStaticParams`). `SpecRadar`는 `dynamic(..., {ssr:false})` |
| `/methodology` | `app/methodology/page.tsx` | 정적 콘텐츠 |

### Client/Server 경계

- `ShoesBrowser` — `'use client'`, 필터·정렬 상태를 **URL searchParams**로 관리 (새로고침 유지)
- `SpecRadar` — `dynamic` lazy-load (차트 라이브러리 SSR 불가)
- `Navbar` — `'use client'`, `usePathname`으로 active 상태 표시
- `ScrollRevealSection`, `AnimatedCardGrid`, `AnimatedSpecBar`, `AnimatedCounter`, `DetailImageViewer` — `'use client'` 애니메이션 컴포넌트, 모두 `useReducedMotion()` 지원
- 나머지 컴포넌트는 서버 컴포넌트

### Shoe 점수 이중 구조

모든 스펙에 정수 `score`(1–10, 표시용)와 소수 `raw*`(정렬 정밀도용) 두 가지 존재.
`lib/data.ts`의 `specVec()` 및 홈 `getRawScore()`는 `raw*` 우선 사용.

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
python3 scripts/normalize_from_reviews.py --apply    # Case C-리뷰: 정성 리뷰 → proposedScores (사람 검토 필요)
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
| C-리뷰 | 실측 없음, 정성 리뷰 있음 | `normalize_from_reviews.py` → 사람 검토 후 적용 |
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

- 애니메이션 컴포넌트 신규 추가 시: `lib/motion.ts`에서 variants import, `useReducedMotion()` 필수, `whileInView`에 `viewport={{ once: true }}` 항상 사용
- `rawCushioning: null` → Case C-KNN → `impute_scores.py` 필요
- 스택 수치는 반올림 (39.5mm → 40mm)
- RTINGS ER%는 0–100 스케일 (0–10 아님)
- `scripts/formulas.py`가 모든 점수 공식의 단일 출처 — 여기서만 수정
- `rawStability` / `rawDurability`는 normalize 스크립트가 기록한 calibrated 값 — `recalculate --apply` (plain)으로 덮어쓰면 앵커 drift 발생. 재계산 필요 시 `--calibrate --apply` 또는 `--only value` 사용
