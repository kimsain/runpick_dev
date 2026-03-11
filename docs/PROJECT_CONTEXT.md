# RunPick Project Context

마지막 검증일: 2026-03-11

## 문서 목적

이 문서는 RunPick 저장소의 현재 운영 맥락을 빠르게 복구하기 위한 허브 문서입니다.
향후 작업자는 이 문서를 먼저 읽고, 상세 규칙은 연결된 권위 파일로 내려가서 확인합니다.

## 이 문서를 업데이트해야 하는 경우

- `data/brands/*.json`의 브랜드 수, 신발 수, 필드 구조, confidence 분포가 바뀔 때
- `lib/types.ts`, `lib/data.ts` 또는 라우트 구조가 바뀔 때
- `scripts/formulas.py` 또는 정규화/재계산 파이프라인 순서가 바뀔 때
- `components/ShoesBrowser.tsx`의 query param 계약이 바뀔 때
- 새 리스크가 확인되거나 기존 함정이 해소될 때

## 현재 상태 스냅샷

- 서비스 성격: 러닝화 스펙 비교 및 탐색 사이트
- 프레임워크: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Recharts, Framer Motion
- 렌더링 방식: `lib/data.ts`에서 로컬 JSON을 동기 로드하고 SSG로 페이지를 생성
- 운영 카탈로그 기준: 12개 브랜드, 106개 생산 신발
- 카테고리 분포: `daily` 50, `super-trainer` 26, `racing` 30
- confidence 분포: `very-high` 70, `high` 25, `medium` 7, `low` 4
- research 기준 고유 신발 ID: 115개
- research 스냅샷 JSON 수: 207개
- production과 research 불일치: production only 1개(`decathlon/kipstorm-tempo`), research only 10개
- 비고: build 로그의 `115`는 전체 정적 페이지 수이며 신발 수가 아니다

## 진실의 우선순위

| 우선순위 | 위치 | 역할 |
|---|---|---|
| 1 | `data/brands/*.json` | 실제 서비스에 노출되는 운영 카탈로그 |
| 1 | `scripts/formulas.py` | 점수 공식과 앵커의 단일 출처 |
| 2 | `lib/types.ts` | 앱이 기대하는 데이터 계약 |
| 2 | `lib/data.ts` | 브랜드 JSON 집계, slug 조회, 유사 신발 계산, 범위 계산 |
| 3 | `research/` | 수집 결과, proposedScores, 점수 검토용 스냅샷 |
| 3 | `scripts/*.py` | 수집, 정규화, 보정, 검증, 카피 생성 파이프라인 |
| 4 | `docs/` | 결정 배경, 토론 기록, 계획, 변경 이력 |
| 5 | `app/methodology/page.tsx` | 사용자 설명용 요약 페이지 |

주의:
- 점수 계산의 진실은 `app/methodology/page.tsx`가 아니라 `scripts/formulas.py`와 정규화 스크립트에 있다.
- `research/`는 운영 배포 데이터가 아니라 수집 및 검토 레이어다.

## 런타임 아키텍처

### 라우트

- `/`: 홈. `getAllShoes()`와 `getBrands()`를 직접 읽어 히어로와 큐레이션 섹션을 렌더링한다.
- `/shoes`: 탐색 페이지. 서버에서 전체 신발/브랜드/범위를 계산하고, 실제 필터링과 정렬은 클라이언트 `ShoesBrowser`가 담당한다.
- `/shoes/[slug]`: 상세 페이지. `generateStaticParams()`가 모든 slug를 SSG 대상으로 만들고, `SpecRadar`만 클라이언트 동적 로드한다.
- `/methodology`: 사용자용 점수 설명 페이지.
- `/robots.txt`, `/sitemap.xml`: 메타 라우트.

### 데이터 흐름

1. `data/brands/*.json`을 `lib/data.ts`가 import한다.
2. 서버 컴포넌트가 `getAllShoes()`, `getBrands()`, `getShoeBySlug()` 등을 직접 호출한다.
3. `/shoes`에서는 URL search params를 `components/ShoesBrowser.tsx`가 읽어 클라이언트 필터링/정렬을 수행한다.
4. `/shoes/[slug]`에서는 `shoe.sources`, `shoe.confidence`, `shoe.specs`가 상세 UI 전반에 직접 반영된다.

### 구조적 특징

- API 계층이 없다. 데이터 파일을 바꾸면 UI, SEO metadata, SSG 결과가 함께 바뀐다.
- `confidence`는 카드 배지, 상세 배너, 홈 큐레이션, 레이더 차트 스타일에 모두 영향을 주는 횡단 개념이다.
- 홈 히어로의 회전 신발 목록은 `components/AnimatedHeroContent.tsx`에 하드코딩되어 있다.

## 필터/정렬 인터페이스

`/shoes`의 query param은 사실상 내부 공개 인터페이스다.

| 파라미터 | 의미 | 실제 처리 위치 |
|---|---|---|
| `brands` | 쉼표 구분 브랜드 ID 목록 | `components/ShoesBrowser.tsx`, `components/FilterPanel.tsx` |
| `category` | `daily`, `super-trainer`, `racing` | `components/ShoesBrowser.tsx` |
| `maxPrice` | 최대 가격 | `components/ShoesBrowser.tsx` |
| `maxWeight` | 최대 무게(g) | `components/ShoesBrowser.tsx` |
| `maxDrop` | 최대 드롭(mm) | `components/ShoesBrowser.tsx` |
| `minCush` | 최소 쿠션성 점수 | `components/ShoesBrowser.tsx` |
| `minResp` | 최소 반응성 점수 | `components/ShoesBrowser.tsx` |
| `minStab` | 최소 안정성 점수 | `components/ShoesBrowser.tsx` |
| `minDur` | 최소 내구성 점수 | `components/ShoesBrowser.tsx` |
| `minWS` | 최소 경량성 점수 | `components/ShoesBrowser.tsx` |
| `minVS` | 최소 가성비 점수 | `components/ShoesBrowser.tsx` |
| `sort` | 정렬 기준과 방향 | `components/ShoesBrowser.tsx`, `components/FilterPanel.tsx` |

정렬 메모:
- 이름, 가격, 무게 외의 스펙 정렬은 정수 점수와 raw 점수를 함께 사용해 동점 품질을 높인다.
- 활성 필터 칩의 브랜드 라벨은 현재 `brandId.toUpperCase()` 기반이다.

## 데이터 모델

### 핵심 타입

- `BrandData`: `{ brand, shoes[] }` 형태의 브랜드 JSON 단위
- `Brand`: 브랜드 메타데이터
- `Shoe`: 상세 페이지와 카드 UI가 직접 사용하는 단위 모델
- `Specs`: 점수, 물성, raw 정렬값을 묶은 스펙 구조

### `Shoe`에서 자주 보는 필드

- `id`, `brandId`, `slug`: 내부 식별과 라우팅 기준
- `categoryId`, `subcategoryId`: 카테고리와 파이프라인 휴리스틱 기준
- `price`, `priceFormatted`: 수치 계산용 가격과 노출용 가격
- `description`, `shortDescription`, `pros`, `cons`, `bestFor`: 카피 레이어
- `sources`: `runrepeat`, `rtings`, `dor`, `rtr`, `bitr` URL 모음
- `confidence`: `very-high`, `high`, `medium`, `low`

### `Specs` 필드 의미

- 정수 점수: `cushioning`, `responsiveness`, `stability`, `durability`, `weightScore`, `valueScore`
- 물성: `weight`, `drop`, `stackHeight`
- raw 정렬값: `rawCushioning`, `rawResponsiveness`, `rawStability`, `rawDurability`, `rawValueScore`, `rawLightness`
- 디버그 컴포넌트: `stabilityComponents`, `durabilityComponents`

### raw 점수 해석

- 정수 점수는 사용자 노출과 필터 기준이다.
- raw 점수는 더 미세한 정렬과 유사도 계산에 쓰인다.
- `rawStability`, `rawDurability`는 현재 앵커 기준으로 이미 보정된 값이므로 plain `recalculate --apply`로 다시 만지면 drift 위험이 있다.
- 현재 안정성/내구성 score version은 `durability-stability-v3`다.
- `stabilityComponents`, `durabilityComponents`는 methodology 검증과 drift 확인용 내부 디버그 필드다.

### 운영상 해석

- Case A/B/C는 파이프라인 개념이다.
- 현재 production JSON은 대부분 최종 반영 상태이며, UI는 케이스를 직접 보지 않고 최종 `specs`와 `confidence`만 소비한다.

## 데이터 파이프라인

### 표준 순서

1. `python3 scripts/collect_shoe.py --shoe-id <id>`
2. `python3 scripts/normalize_from_runrepeat.py --apply`
3. `python3 scripts/normalize_from_rtings.py --apply`
4. `python3 scripts/normalize_from_reviews.py --apply --sync-production`
5. `python3 scripts/impute_scores.py --apply`
6. `python3 scripts/recalculate.py --calibrate --apply`
7. `python3 scripts/verify_all_specs.py`
8. 필요 시 `python3 scripts/write_copy.py --brand <brand> --shoe <shoe-id> --apply`

### 케이스별 역할

- Case B: RunRepeat 계측치가 있으면 `normalize_from_runrepeat.py`가 우선 신호를 사용한다.
- Case A: RunRepeat는 없고 RTINGS만 있으면 `normalize_from_rtings.py`가 RTINGS platform core와 structured qualitative signal을 사용한다.
- Case C-리뷰: 실측이 없고 정성 리뷰만 있으면 `normalize_from_reviews.py`가 stability/durability를 deterministic하게 계산하고, cushioning/responsiveness는 LLM 또는 fallback으로 동기화한다.
- Case C-KNN: 실측과 리뷰가 모두 부족하면 `impute_scores.py`가 production JSON을 직접 보정한다.

### 점수 체계 운영 원칙

- 공식 변경은 `scripts/formulas.py`에서만 한다.
- 안정성 V3는 `structure(TR/HCS) + platform(width/ratio) - sway(stack+softness) + qualitative share modifier` 구조다.
- 내구성 V3는 `outsole + upper` core에 `outsole hardness`, `qualitative durability signal`, `RTINGS longRun modifier`를 더하는 구조다.
- `RTINGS longRun`은 2026-03-09 기준 커버리지가 `60/115 = 52.2%`라서 core가 아니라 modifier-only로 사용한다.
- `recalculate.py --calibrate --apply`는 `VALUE_RATIO_MAX`, `STAB_RAW_MIN/MAX`, `DUR_RAW_MIN/MAX`를 현재 데이터 기준으로 갱신한다.
- 가성비만 다시 계산할 때는 `python3 scripts/recalculate.py --apply --only value`를 우선 사용한다.
- 공개 설명 페이지와 실제 공식이 어긋날 수 있으므로, 공식 변경 뒤에는 `app/methodology/page.tsx`와 `docs/METHODOLOGY.md`도 같이 확인한다.

## 작업 시나리오 체크리스트

### 새 신발 추가

1. 대상 브랜드 JSON에 신발 기본 레코드를 추가한다.
2. `scripts/collect_shoe.py --shoe-id <id>`로 research 스냅샷을 만든다.
3. normalize 계열 스크립트를 케이스에 맞게 적용한다.
4. 필요 시 `impute_scores.py --apply`를 실행한다.
5. `recalculate.py --calibrate --apply`로 파생 점수를 갱신한다.
6. `verify_all_specs.py`, `npm run lint`, `npm run build`를 실행한다.
7. 카피가 비어 있거나 오래되었으면 `write_copy.py`를 실행한다.
8. 이 문서의 스냅샷 수치와 리스크 항목이 바뀌었는지 확인한다.

### 기존 신발 수치 수정

1. 수정 출처가 production인지 research인지 먼저 구분한다.
2. 계측치/공식 변경이면 normalize 또는 recalculate를 다시 실행한다.
3. 카피 변경이 필요한지 확인한다.
4. `verify_all_specs.py`, `npm run build`를 다시 돌린다.

### 공식 변경

1. `scripts/formulas.py`를 수정한다.
2. 관련 normalize/recalculate 스크립트를 다시 실행한다.
3. `docs/METHODOLOGY.md`, `app/methodology/page.tsx`, 관련 debate 문서를 함께 점검한다.
4. `verify_all_specs.py`, `npm run lint`, `npm run build`를 실행한다.
5. 이 문서의 리스크 또는 파이프라인 설명이 바뀌면 갱신한다.

### 새 브랜드 추가

1. `data/brands/<brand>.json`을 추가한다.
2. `lib/data.ts`에 import와 `allBrandData` 등록을 추가한다.
3. 신발별 research/normalize/recalculate를 실행한다.
4. 브랜드 수, 신발 수, 범위값, SSG 결과를 다시 확인한다.
5. 이 문서의 스냅샷 수치를 갱신한다.

### 카피만 수정

1. `write_copy.py` 또는 직접 JSON 편집으로 카피 레이어만 바꾼다.
2. `shortDescription`, `description`, `pros`, `cons`, `bestFor` 규칙을 다시 확인한다.
3. `npm run build`로 카드/상세 노출이 깨지지 않는지 확인한다.

## 현재 리스크와 함정

- `/methodology`는 현재 `app/sitemap.ts`에 포함되어 있지 않다.
- 홈 히어로 회전 신발 목록은 `components/AnimatedHeroContent.tsx`에 하드코딩되어 있어 데이터셋과 자동 동기화되지 않는다.
- `data/brands`와 `research/`는 완전히 일치하지 않는다.
- production only 신발은 `decathlon/kipstorm-tempo` 1개다.
- research only 신발은 10개다: `brooks/glycerin-gts-22`, `brooks/hyperion-gts-2`, `brooks/launch-12`, `brooks/revel-8`, `hoka/gaviota-5`, `hoka/gaviota-6`, `hoka/mach-6`, `hoka/rocket-x-trail`, `hoka/skyward-x`, `saucony/axon-3`.
- production 신발 중 `decathlon/kipstorm-tempo`, `on/cloudboom-volt`는 `sources`가 비어 있다.
- `scripts/apply_sources.py`는 큰 수동 URL 맵을 직접 관리하므로 drift와 누락 위험이 있다.
- `app/methodology/page.tsx`와 `docs/METHODOLOGY.md`는 설명용 문서이므로, `scripts/formulas.py`와 시간이 지나며 어긋날 수 있다.
- `scripts/add_confidence.py`는 오래된 고정 checkpoint 경로(`research/2026-02-18/checkpoint.json`)를 사용하므로 현재 운영 기준 자동화 스크립트로 보기 어렵다.
- `AGENTS.md`, `CLAUDE.md`, 일부 docs에는 오래된 신발 수 표현이 남아 있을 수 있으므로 작업 중 최신 수치와 충돌하는지 확인해야 한다.

## 검증된 현재 상태

2026-03-11에 아래를 실제 실행해 확인했다.

- `python3 scripts/verify_all_specs.py`: 이상값 0건
- `npm run build`: 통과, Next.js 14.2.35 기준 정적 페이지 생성 완료
- confidence distribution recount: `very-high 70`, `high 25`, `medium 7`, `low 4`
- research snapshot recount: `207`개 JSON, research unique IDs `115`

검증 메모:
- build 로그의 `Generating static pages (115/115)`는 전체 정적 페이지 수다.
- production shoe count 106과 동일한 뜻이 아니다.

## 참고 문서 맵

- 운영 공식 설명: `docs/METHODOLOGY.md`
- 스크립트 변경 이력: `docs/CHANGELOG.md`
- 점수 토론 요약: `docs/SCORE_DEBATE_PLAYBOOK.md`
- 세부 토론:
  - `docs/CUSHIONING_DEBATE_2026-02-23.md`
  - `docs/RESPONSIVENESS_DEBATE_2026-02-23.md`
  - `docs/STABILITY_DEBATE_2026-02-23.md`
- 계획 문서:
  - `docs/plans/2026-02-24-statistical-imputation.md`
  - `docs/plans/2026-02-25-fetch-reviews.md`
  - `docs/plans/2026-02-27-on-data-fixes.md`

읽는 순서 권장:
1. 이 문서
2. `scripts/formulas.py`
3. `lib/types.ts`, `lib/data.ts`
4. 관련 스크립트와 debate 문서

## Recent Context Updates

- 2026-03-11: `nike/structure-plus`에 RunRepeat source(`https://runrepeat.com/nike-structure-plus`)를 연결하고 오늘자 research 스냅샷을 추가했다.
- 2026-03-11: `structure-plus`를 Case B로 재정규화해 stability `10`, durability `7`, valueScore `8`, confidence `high`로 반영했다.
- 2026-03-11: 운영 스냅샷을 재계산해 confidence 분포 `70/25/7/4`, research 스냅샷 JSON 수 `207`로 문서를 갱신했다.
- 2026-03-09: `docs/PROJECT_CONTEXT.md` 생성. production 106개, research 고유 ID 115개, research 스냅샷 JSON 205개 기준으로 문서화.
- 2026-03-09: `npm run lint`, `npm run build` 통과 상태를 문서에 고정.
- 2026-03-09: production/research 불일치, 빈 `sources`, 하드코딩 히어로, `/methodology` sitemap 누락을 현재 리스크로 기록.
- 2026-03-09: stability/durability V3 rollout 반영. `stabilityComponents`, `durabilityComponents`, `derivedSignals`, `durability-stability-v3` score version을 운영 문서에 반영.
- 2026-03-09: `RTINGS longRun` 커버리지 `60/115 = 52.2%`를 확인했고, coverage policy에 따라 durability에서는 modifier-only로 사용하도록 확정.

## Update Checklist

- [ ] 브랜드 수, 신발 수, confidence 분포를 다시 계산했는가
- [ ] production/research 불일치 목록이 바뀌었는가
- [ ] `lib/types.ts` 또는 `lib/data.ts` 계약이 바뀌었는가
- [ ] `/shoes` query param 계약이 바뀌었는가
- [ ] `scripts/formulas.py` 또는 파이프라인 순서가 바뀌었는가
- [ ] `app/methodology/page.tsx`와 `docs/METHODOLOGY.md`를 같이 확인했는가
- [ ] `npm run lint`와 `npm run build`를 다시 실행했는가
- [ ] 이 변경이 `docs/CHANGELOG.md`에 남아야 하는 성격인지 확인했는가
