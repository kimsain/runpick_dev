# Scripts Changelog

스크립트 수정 이력. Claude가 scripts/ 파일을 수정할 때마다 맨 위에 항목 추가.

---

## 2026-02-26 — scripts/ 정리 (3개 삭제, 2개 아카이브)

- `check_text_quality.py` 삭제 — write_copy.py validate_copy()로 역할 대체
- `fix_confidence.py` 삭제 — 13개 신발 핫픽스 이미 JSON 반영 완료
  ⚠ 주의: add_confidence.py 재실행 시 해당 13개 신발 confidence 값 변경될 수 있음
- `compute_raw_scores.py` 삭제 — normalize_from_runrepeat.py:93,102 및 normalize_from_rtings.py:84,92에 내장
- `calibrate_rtings.py` → `scripts/archive/` 이동 — 향후 RTINGS 공식 재보정 시 참고용
- `analyze_imputation.py` → `scripts/archive/` 이동 — 향후 imputation 재설계 시 참고용

---

## 2026-02-26 — 86개 신발 한국어 문구 자동 재작성 (scripts/write_copy.py)

- Codex → Gemini 피드백 → Codex 최종 3단계 루프로 전체 86개 신발 문구 재작성
- 현재 점수(cushioning/responsiveness/stability/durability/weightScore/valueScore)와 문구 동기화
- shortDescription 12-28자, pros 2-4개, cons 1-3개 자동 검증 (86/86 통과)
- 체크포인트 기반 재개 지원, 브랜드별 병렬 처리(최대 3개 동시)

---

## 2026-02-25 — 정성 데이터 신발 imputation 재설계 (scripts/impute_scores.py)

- ElasticNetCV → Foam-calibrated Subcategory KNN Median으로 전면 교체
  - 이유: 모든 차원 LOOCV 실패 (MaxAE 4.0-5.0), 100% category mean fallback 동작 중
- foam_class 4단계 매핑 (peba/supercritical/standard_eva/unknown)
  - 한글 tech명 포함 (고반발 미드솔/슈퍼폼/쿠셔닝 폼 등)
  - 오분류율 61.6% other → 0% (전 신발 분류 완료)
- Case C (6개): cushioning/responsiveness/stability/durability + raw 점수 전부 imputation
- Case A (12개): stability/durability + rawStability/rawDurability imputation
- ±2 하드 보호 제거 → ±3 소프트 경고 (로그만)
- sklearn 의존성 제거 (numpy만 사용)
- 설계 토론: docs/plans/2026-02-25-qualitative-imputation-redesign.md

---

## 2026-02-25 — 내구성·안정성 점수 공식 개선 (scripts/formulas.py, scripts/normalize_from_runrepeat.py)

- 내구성: toeboxDurability + heelPaddingDurability 블렌딩 추가 (70/20/10 가중치)
  - 새 상수: DUR_OUTSOLE_WEIGHT=0.70, DUR_TOEBOX_WEIGHT=0.20, DUR_HEEL_PAD_WEIGHT=0.10
- 안정성: midsoleWidthHeel_mm / midsoleWidthForefoot_mm 15% 컴포넌트 추가 (TR 35%/HCS 50%/Width 15%)
  - width 있으면 sway 패널티 STAB_SWAY_SCALE(0.5) 배로 축소
  - 새 상수: STAB_MW_HEEL_LO=71, STAB_MW_HEEL_HI=105, STAB_MW_FORE_LO=101, STAB_MW_FORE_HI=124, STAB_SWAY_SCALE=0.5
- normalize_from_runrepeat.py: RESEARCH_DIR → 2026-02-25, 새 필드 추출 추가
- VALUE_RATIO_MAX 업데이트: novablast-5 rawDurability 변화(7.59→6.09)로 새 raw sum=26.18 반영 (28/169000 → 26.18/169000)

---

## 2026-02-25

### 수정
- `scripts/collect_shoe.py` — `attributeScores` 모든 카테고리에 scale/단위 메타데이터 추가. RunRepeat: cushioning(`scaleHA`/`scaleAC`), stability(`scaleWidth:"mm"`), durability(`scaleDurabilityRating:"rating 1-5"`), physical/sizeAndFit/misc(`scale:"mixed"`). RTINGS: firmnessHeel/firmnessForefoot(`scale:"N/mm"`), energyHeel/energyForefoot/longRun(`scale:"J"`), physical(`scale:"mixed"`), design(`scale:"categorical"`). RTINGS `fit` → `fitScores`(`scale:"/10"`) + `fitDeviations`(`scale:"mm"`) 분리.
- `scripts/collect_shoe.py` — `labMeasurements` 제거, `attributeScores` 포괄적 카테고리로 확장: RunRepeat 7개(cushioning/responsiveness/stability/durability/physical/sizeAndFit/misc), RTINGS 10개(cushioning/responsiveness/firmnessHeel/firmnessForefoot/energyHeel/energyForefoot/longRun/physical/design/fit). null 필드 자동 필터(`_nn()`), `unknown_test_ids` 자연 제외.
- `scripts/collect_shoe.py` — research JSON 확장: 정량 소스에 `labMeasurements` 추가 (RunRepeat ~34개·RTINGS ~45개 raw 필드 전체 보존). `physicalSpecs` 제거. 정성 소스 null 패딩 제거 → `keyFindings`만 저장. `currentSpecs`는 여전히 공식 스펙 기준 유지.

### 신규 스크립트
- `scripts/collect_shoe.py` — RunRepeat·RTINGS·DOR·RTR·BITR 5개 소스 자동 수집 오케스트레이터. `--shoe-id ID`로 신발 1개 전체 수집 → `research/{date}/{brand}/{id}.json` 저장.
- `scripts/fetch_rtings.py` — RTINGS 내부 API (api/v2/safe/app/product_vue_page__page_body) 직접 호출로 77개 측정 필드 자동 수집. 쿠키 불필요, urllib 전용.
- `scripts/fetch_reviews.py` — Playwright로 DOR/RTR/BITR 정성리뷰 기사 본문 자동 추출. rawText JSON 출력 후 Codex(ai-team MCP)가 4대 지표 중심 keyFindings 요약.

### 삭제
- `scripts/fetch_runrepeat_forefoot.py` — `fetch_runrepeat.py`의 `product.lab.values` 경로 추출로 통합 완료, 중복 제거
- `scripts/migrate_sources.py` — 일회성 마이그레이션 완료
- `scripts/scrape_outsole_data.py`, `scripts/scrape_stability_data.py` — 데이터 수집 완료, 재실행 위험
- `scripts/update_stability_fields.py`, `scripts/update_outsole_fields.py` — 일회성 JSON 업데이트 완료
- `scripts/compute_stability_scores.py`, `scripts/update_brand_stability.py` — 일회성 배포 완료
- `scripts/stability_data.json`, `scripts/stability_scores.json`, `scripts/outsole_data.json` — 레거시 artifact

### 문서화
- `scripts/fix_confidence.py` — 모듈 docstring 추가 (hotfix 이유 설명)
- `scripts/check_text_quality.py` — 함수 docstring 및 상수 설명 추가
- `scripts/apply_sources.py` — SOURCES dict schema 설명 블록 추가
- `scripts/recalculate.py` — main() docstring 추가
- `scripts/analyze_imputation.py` — 함수 docstring 추가

---

## 2026-02-23

### 공식 업데이트 (formulas.py)
- 쿠션성: CUSH_MIN_SA=88, CUSH_MAX_SA=150 고정 앵커, heel/forefoot=40/60 통일
- 반응성: RESP_LO=46, RESP_RANGE_INT=34, RESP_RANGE_RAW=45; 서브카테고리 페널티 추가
- VALUE_RATIO anchors: adizero-pro-evo-2(sum=22/599K), novablast-5(sum=28/169K)
- 상세: docs/CUSHIONING_DEBATE_2026-02-23.md, docs/RESPONSIVENESS_DEBATE_2026-02-23.md

---

## 2026-02-22

### 공식 초기 설계 (formulas.py)
- 쿠션성·반응성·안정성·내구성·경량성·가성비 6개 지표 1-10 점수화
- RunRepeat SA + RTINGS ER% 통합 공식 확립
- 상세: docs/FORMULA_DEBATE_2026-02-22.md

---

## 2026-02-19 이전

### 초기 데이터 수집 (완료, 스크립트 삭제됨)
- RunRepeat 안정성/outsole 데이터 수집 (scrape_stability_data.py, scrape_outsole_data.py)
- 데이터 JSON 포맷 마이그레이션 (migrate_sources.py, update_* 시리즈)
- 점수 초기 계산 및 배포 (compute_stability_scores.py, update_brand_stability.py)
