# RunPick 점수 재설계 플레이북

> **인간 참고용 문서**. 자동화 절차는 `~/.claude/skills/runpick-score-debate/SKILL.md` 참조.

## 1. 합의 기준 (7개, 모든 점수 공통)

모든 기준을 통과해야 합의가 성립한다.

| # | 기준 | 조건 | 종류 |
|---|------|------|------|
| 1 | 분포 커버리지 | 활성 구간 ≥ 7개 (1~10점 중 실제 신발 존재) | Hard gate |
| 2 | 분산 충분성 | σ ≥ 1.8 | Hard gate |
| 3 | 상위 분포 | 9~10점 비율 15~35% | Hard gate |
| 4 | 하위 분포 | 1~2점 비율 5~25% | Hard gate |
| 5 | Case A/B 일관성 | MAE ≤ 0.6 | Hard gate |
| 6 | 동적 안정성 | 고정 앵커 + ratchet rule | Hard gate |
| 7 | 단일 신발 이상값 | MaxAE ≤ 1.5 (Case A/B 최대 편차) | Hard gate |

**기준 미충족 판단 방법**:

```bash
# 기준 1~4: 분포 통계 확인
python3 scripts/verify_all_specs.py

# 기준 5, 7: MAE + MaxAE 계산
python3 -c "
import json, statistics
from pathlib import Path

field = 'cushioning'  # 대상 점수로 교체
errors = []
for fp in Path('data/brands').glob('*.json'):
    for s in json.load(open(fp))['shoes']:
        case_b = s.get('specs', {}).get(field)
        # Case A 재계산 후 비교 (normalize_from_rtings 로직 적용)
        # case_a = ...
        # if case_b is not None and case_a is not None:
        #     errors.append(abs(case_b - case_a))
if errors:
    print(f'MAE={sum(errors)/len(errors):.3f}, MaxAE={max(errors):.3f}')
"
```

**기준 2 (σ ≥ 1.8) 현황 참고**:

2026-02-23 기준 실측값. 일부 스펙은 데이터 특성상 기준 달성이 어려울 수 있음:

| 스펙 | σ | 비고 |
|------|---|------|
| cushioning | 1.94 | 통과 |
| responsiveness | 1.67 | 미달 (반응성 데이터 중간 집중) |
| stability | 1.41 | 미달 (카테고리 휴리스틱 한계) |
| durability | 1.77 | 근접 |

---

## 2. 점수별 수집 데이터

| 스펙 | Case B 소스·필드 | Case A 소스·필드 | 단위 |
|------|----------------|----------------|------|
| **Cushioning** | RunRepeat: heelSA, forefootSA | RTINGS: heelSA (0~10), forefootSA (0~10) | RunRepeat: 원시 SA값 |
| **Responsiveness** | RunRepeat: heelER%, forefootER% | RTINGS: heelER (0~10), forefootER (0~10) | RunRepeat: %, RTINGS: 0~10 |
| **Stability** | RunRepeat: torsionalRigidity (0~5), heelCounterStiffness (0~5) | 카테고리 휴리스틱 + 키워드 | RunRepeat: /5 scale |
| **Durability** | RTINGS: outsoleThickness (mm), outsoleDurability (mm/100km) | RTINGS: 동일 (단 누락 多) | mm, mm/100km |
| **Lightness** | 공통: weight (g) | 공통: weight (g) | g (남성 US9 기준) |
| **Value** | 공통: price (KRW), 4개 스펙 합산 | 공통: 동일 | KRW |

**데이터 수집 품질 체크** (`Phase -1`):

```bash
# 각 스펙별 missing rate 확인
python3 -c "
import json; from pathlib import Path
fields = {
    'cushioning': ('RunRepeat', ['cushioning.heelShockAbsorption', 'cushioning.forefootShockAbsorption']),
    'responsiveness': ('RunRepeat', ['responsiveness.heelEnergyReturn', 'responsiveness.forefootEnergyReturn']),
    'stability': ('RunRepeat', ['stability.torsionalRigidity', 'stability.heelCounterStiffness']),
}
for spec, (src_name, paths) in fields.items():
    total, missing = 0, 0
    for fp in Path('data/brands').glob('*.json'):
        for s in json.load(open(fp))['shoes']:
            src = next((x for x in s.get('sources', []) if x.get('source') == src_name), None)
            if src:
                total += 1
                a = src.get('attributeScores', {})
                for path in paths:
                    keys = path.split('.')
                    v = a
                    for k in keys: v = v.get(k, None) if isinstance(v, dict) else None
                    if v is None: missing += 1; break
    print(f'{spec}: {src_name} {total}개 중 missing {missing} ({missing/max(total,1)*100:.1f}%)')
"
```

---

## 3. 점수별 권장 라운드 주제

상세 내용은 `~/.claude/skills/runpick-score-debate/references/score-data-guide.md` 참조.

### 쿠션 (완료 — 2026-02-23)
결론: CUSH_MIN_SA=88, CUSH_MAX_SA=150, heel/forefoot=40/60 통일.
→ 토론 레코드: `docs/CUSHIONING_DEBATE_2026-02-23.md`

### 반응 (완료 — 2026-02-23)
결론: RESP_LO=40, RESP_RANGE_INT=42, RESP_RANGE_RAW=45, heel/forefoot=40/60, RESP_PENALTY_BY_SUBCAT 재보정.
구조적 한계: bot1-2=3.5%(기준 5% 미달, 실데이터 한계), MAE=0.984·MaxAE=3 (RTINGS/RunRepeat 방법론 차이).
→ 토론 레코드: `docs/RESPONSIVENESS_DEBATE_2026-02-23.md`

### 안정 (Stability)
- R1: torsionalRigidity vs heelCounterStiffness 가중치 동일성
- R2: Case A 기본값 6/8 — 실측 평균 대비 적합성
- R3: keyword_delta ±1 → ±2 필요성
- Red-team: 카테고리 레이블 과의존 문제

### 내구 (Durability)
- R1: DUR_LOG_BASE=8.2 재보정 (현행 86개 신발 분포 기준)
- R2: abrasion_only fallback 선형 vs log
- R3: outsoleThickness 누락 비율 → fallback 의존도 점검
- Red-team: ratio = thickness/abrasion 개념의 구조적 한계

### 경량 (Lightness)
- R1: 선형 vs log (Weber's Law) 스케일
- R2: LIGHT_G=129, HEAVY_G=351 앵커 유효성
- R3: size/gender 보정 없이 g 직접 비교 공정성
- Red-team: 카테고리 간 무게 비교의 공정성 문제

### 가성비 (Value)
- R1: 앵커 쌍 (adizero-pro-evo-2, novablast-5) 현행 적합성
- R2: 4개 스펙 합산 vs weightScore 포함
- R3: 가격 exponent 선형 vs 비선형 근거
- Red-team: 단일 ratio 점수로 가성비를 표현하는 한계

---

## 4. 스크립트 실행 순서

### 표준 재계산 절차

```bash
# 1. Case B (RunRepeat + RTINGS): dry-run 확인
python3 scripts/normalize_from_runrepeat.py

# 2. Case B 적용
python3 scripts/normalize_from_runrepeat.py --apply

# 3. Case A (RTINGS only): dry-run 확인
python3 scripts/normalize_from_rtings.py

# 4. Case A 적용
python3 scripts/normalize_from_rtings.py --apply

# 5. VALUE_RATIO 앵커 갱신 (새 앵커 신발이 추가된 경우에만)
python3 scripts/recalculate.py --calibrate

# 6. weightScore + valueScore 재계산
python3 scripts/recalculate.py --apply

# 7. 전체 스펙 검증
python3 scripts/verify_all_specs.py
```

### 롤백 절차

```bash
# 변경 사항 확인
git diff scripts/formulas.py data/brands/

# formulas.py만 롤백
git checkout -- scripts/formulas.py

# 데이터도 롤백 (필요 시)
git checkout -- data/brands/
```

---

## 5. 검증 스크립트

### Spearman Rho 순위 일관성 (Gemini 피드백)

기준: rho ≥ 0.85

```python
#!/usr/bin/env python3
"""
공식 변경 전후 순위 일관성 검증.
사용법:
  python3 scripts/check_rank_consistency.py --field cushioning
"""

import json, sys
from pathlib import Path
from scipy.stats import spearmanr

def load_field(field):
    scores = {}
    for fp in Path('data/brands').glob('*.json'):
        for s in json.load(open(fp))['shoes']:
            v = s.get('specs', {}).get(field)
            if isinstance(v, (int, float)):
                scores[s['id']] = v
    return scores

# 사용 예: 변경 전 점수를 따로 저장해두고 비교
# old_scores = load_from_git('HEAD~1', field)
# new_scores = load_field(field)
# common = sorted(set(old_scores) & set(new_scores))
# rho, p = spearmanr([old_scores[k] for k in common], [new_scores[k] for k in common])
# print(f'Spearman Rho={rho:.3f} (기준: ≥0.85), p={p:.4f}')
# assert rho >= 0.85, f'순위 일관성 실패: {rho:.3f} < 0.85'
```

### MaxAE 검증

기준: MaxAE ≤ 1.5

```python
#!/usr/bin/env python3
"""
Case A vs Case B 최대 편차 검증.
동일 신발에 두 처리 방식을 모두 적용하여 최대 점수 차이를 확인.
"""

import json
from pathlib import Path

field = 'cushioning'  # 대상 점수로 교체

errors = []
for fp in Path('data/brands').glob('*.json'):
    for s in json.load(open(fp))['shoes']:
        srcs = {x.get('source') for x in s.get('sources', [])}
        if 'RunRepeat' in srcs and 'RTINGS' in srcs:
            case_b = s.get('specs', {}).get(field)
            # case_a = 별도 계산 필요
            # if case_b is not None and case_a is not None:
            #     errors.append((s['id'], abs(case_b - case_a)))

if errors:
    errors.sort(key=lambda x: x[1], reverse=True)
    max_ae = errors[0][1]
    mae = sum(e for _, e in errors) / len(errors)
    print(f'MaxAE={max_ae:.2f} (기준: ≤1.5): {errors[0][0]}')
    print(f'MAE={mae:.3f} (기준: ≤0.6)')
    print(f'상위 5: {errors[:5]}')
```

### 벤치마크 쌍 회귀 테스트

```python
#!/usr/bin/env python3
"""
공식 변경 후 벤치마크 쌍 순위 방향 검증.
"""

import json
from pathlib import Path

# (spec, high_shoe, low_shoe) 쌍 정의
PAIRS = [
    ('cushioning', 'vomero-premium', 'adizero-adios-9'),
    ('responsiveness', 'adizero-pro-evo-2', 'bondi-9'),
    ('stability', 'gel-kayano-32', 'vaporfly-4'),
    ('durability', 'gel-kayano-32', 'adizero-pro-evo-2'),
    ('weightScore', 'metaspeed-ray', 'vomero-premium'),
    ('valueScore', 'novablast-5', 'adizero-pro-evo-2'),
]

scores = {}
for fp in Path('data/brands').glob('*.json'):
    for s in json.load(open(fp))['shoes']:
        scores[s['id']] = s.get('specs', {})

failed = []
for spec, high, low in PAIRS:
    h = scores.get(high, {}).get(spec)
    l = scores.get(low, {}).get(spec)
    if h is None or l is None:
        print(f'SKIP {spec}: {high}({h}) vs {low}({l}) — 데이터 없음')
        continue
    ok = h >= l
    status = 'OK' if ok else 'FAIL'
    print(f'{status} {spec}: {high}={h} >= {low}={l}')
    if not ok:
        failed.append((spec, high, low, h, l))

if failed:
    print(f'\n실패 {len(failed)}개 — 롤백 검토 필요')
    raise SystemExit(1)
else:
    print('\n모든 벤치마크 쌍 통과')
```

---

## 6. 공식 버저닝

### SCORE_VERSION 패턴

`scripts/formulas.py` 상단 상수 블록에 기록:

```python
# ─── 버전 ────────────────────────────────────────────────────────────
# SCORE_VERSION = "YYYY-MM-DD-{spec}-v{n}"
# 변경 내역:
#   2026-02-23-cushioning-v2: CUSH_MIN_SA=88, CUSH_MAX_SA=150, heel/forefoot=40/60 통일
#                              RTINGS_CUSH_FACTOR 삭제 (min-max 흡수)
```

### 버전 업데이트 조건

| 조건 | 버전 업데이트 | 비고 |
|------|-------------|------|
| 공식 파라미터 변경 | 필수 | SCORE_VERSION 갱신 |
| 앵커 신발 변경 | 필수 | ratchet rule에 의한 확장 포함 |
| 신발 추가 (앵커 변경 없음) | 불필요 | 재계산만 실행 |
| 데이터 보정 (오타 수정) | 권고 | 변경 범위가 크면 버전 갱신 |

### 롤백 트리거

아래 중 하나라도 발생하면 이전 버전으로 롤백:

1. 벤치마크 쌍 순위 역전 (위 테스트 FAIL)
2. Spearman Rho < 0.85
3. 앵커 신발 점수가 예상값에서 ±2 이상 벗어남
4. 기준 1~7 중 2개 이상 미통과

---

## 7. 과거 토론 레코드

| 날짜 | 스펙 | 결론 | 파일 |
|------|------|------|------|
| 2026-02-23 | 쿠션 (Cushioning) | CUSH_MIN_SA=88, CUSH_MAX_SA=150, 40/60 통일 | `docs/CUSHIONING_DEBATE_2026-02-23.md` |
| 2026-02-23 | 반응 (Responsiveness) | RESP_LO=40, RESP_RANGE_INT=42, RESP_RANGE_RAW=45, 40/60, 페널티 재보정 | `docs/RESPONSIVENESS_DEBATE_2026-02-23.md` |

---

> 공식 변경 시 이 플레이북 절차를 따른다. 멀티 에이전트 토론 실행은 Claude에서 `runpick-score-debate` 스킬을 호출한다.
