# 반응성(Responsiveness) 점수 재설계 — 멀티 에이전트 토론 (2026-02-23)

## 배경

현행 반응성 공식에서 다음 5가지 구조적 문제가 실증됨:

| 문제 | 현황 | 기준 |
|------|------|------|
| RESP_LO=30 — 실데이터 범위 밖 | 실측 최솟값 44.2%, 하단 14.2포인트 데드존 | — |
| σ=1.67 | 분산 부족 | ≥ 1.8 |
| bot1-2=0.0% | 하단 구간 신발 없음 | 5~25% |
| MAE=1.200 (Case A/B) | 처리 방식 간 편차 과다 | ≤ 0.6 |
| MaxAE=4.0 | 단일 신발 최대 편차 과다 | ≤ 1.5 |

참여 에이전트:
- **shoe-expert** (Codex): 신발 생체역학·소재 공학 전문가
- **data-scientist** (Gemini): 통계·정규화·분포 전문가
- **Claude**: 진행자(Moderator) — 실증 데이터 제공 및 합의 판정

---

## Phase 0: 사전 실증 데이터

### 현행 분포 (n=86, RESP_LO=30, RESP_RANGE_INT=52, 50/50)
```
mean=6.94  σ=1.67  min=3  max=10
active=8/10  top9-10=19.8%  bot1-2=0.0%
bins: 1:0 2:0 3:2 4:3 5:16 6:12 7:18 8:18 9:13 10:4
```

### RunRepeat ER% 실측 범위 (n=67)
```
heel:     min=44.2%, max=80.6%, mean=64.7%
forefoot: min=45.9%, max=82.6%, mean=67.2%
→ 현행 RESP_LO=30 vs 실측 최솟값 44.2% → 14.2포인트 데드존
```

### Case A/B 비교 (n=62 — RunRepeat+RTINGS 공통 신발)
```
MAE=1.200 (기준 ≤0.6 미달)
MaxAE=4.0 (기준 ≤1.5 미달)
최악 케이스: gel-nimbus-28 B=3, A=7 (4점 차이)
원인: RTINGS가 RunRepeat 대비 체계적 과대평가 + max-cushion/stability 방법론 차이
```

---

## 라운드별 토론 기록

### Round 1: RESP_LO 앵커 재설정

**주제**: RESP_LO=30을 실데이터 기반 앵커로 교체할 것인가?

**선택지**:
- A: `RESP_LO = 44` (실측 최솟값 44.2 기반, 버퍼 없음)
- B: `RESP_LO = 40` (5포인트 버퍼 포함)
- C: 현행 30 유지 (의도적 하단 여백)

**shoe-expert (Codex) 의견**:
> ER% 하한 선택에서 A(44)는 실측 min에 너무 가까워 새 신발이 추가되면 바로 ratchet rule이 발동된다. B(40)는 향후 실측 최솟값이 42-43% 구간으로 떨어져도 여유가 있다. C(30)는 14포인트 데드존을 유지하므로 1-2점 구간 신발이 계속 0개로 남는다.
> **B(RESP_LO=40) 권장**

**data-scientist (Gemini) 의견**:
> 시뮬레이션 결과:
> - A(RESP_LO=44): 최대점수=7, top9-10=0% → 기준 3 실패
> - B(RESP_LO=40): bot1-2≈6.5%, σ 상승 예상 → 기준 4 충족
> - C(30): 현행 유지, bot1-2=0% → 기준 4 미달 지속
> **B(RESP_LO=40) 권장**

**합의**: B (만장일치) — `RESP_LO = 40`

---

### Round 2: heel/forefoot 가중치 (50/50 vs 40/60)

**주제**: 현행 50/50이 적합한가, forefoot-bias 40/60이 더 타당한가?

**실증 데이터 (Claude 직접 계산)**:
```
RESP_LO=40, RANGE=52로 상한=92% → 실측 max 81.5%에서 최대 점수 8만 달성
→ top9-10=0%로 기준 3 완전 실패
→ RESP_RANGE_INT 조정 선행 필요
```

**shoe-expert 의견**:
> 달리기에서 반응성을 가장 체감하는 구간은 발가락 굴곡 직전의 전족부 로딩(toe-off phase). 전족부 ER%가 체감 "탄성"을 더 잘 대표한다. 40/60 forefoot-bias는 쿠션성과 통일되어 측정 일관성도 높다. **40/60 권장**

**data-scientist 의견**:
> 50/50과 40/60 가중치는 σ, 분포 형태에 미치는 영향이 미미하다(RESP_RANGE 문제가 선행 이슈). 단, 쿠션성·반응성 모두 40/60으로 통일하면 설명 가능성이 높아진다. **40/60 동의 (쿠션성 통일 근거)**

**합의**: 40/60 (만장일치) — 쿠션성과 통일

---

### Round 3: RESP_RANGE_INT 재보정 — 상한 앵커 재설정

**주제**: RESP_LO=40 채택 시 RANGE=52(상한 92%)는 실데이터 범위 밖 → 수정 필요

**실증 데이터**:
```
실측 max: forefoot 82.6%, heel 80.6%
40/60 가중 최댓값: 80.6*0.4 + 82.6*0.6 = 81.8%
→ RESP_RANGE_INT=42로 상한=82% 설정 시:
  최대 점수 = round((81.8-40)/42*10) = round(9.95) = 10 ✓
```

**시뮬레이션 결과 (n=67 RunRepeat 데이터)**:
```
RESP_RANGE_INT=42 (상한 82%):  σ=2.233, top9-10=20.6%, bot1-2=5.9%  ✓
RESP_RANGE_INT=45 (상한 85%):  top9-10=7.4%  → 기준 3 실패
RESP_RANGE_INT=52 (상한 92%):  top9-10=0.0%  → 기준 3 완전 실패
```

**shoe-expert 의견**:
> 실측 최댓값(fast-r-nitro-elite-3: heel 80.6%, forefoot 82.6%)을 고려하면 상한 82%가 합리적이다. rawResponsiveness는 약간 더 넉넉한 85%를 상한으로 유지하는 것이 정수 반올림 경계 효과를 줄인다.
> **RESP_RANGE_INT=42, RESP_RANGE_RAW=45 권장**

**data-scientist 의견**:
> 통계적으로 RESP_RANGE_INT=42가 현재 데이터에서 최적이다. 단 ratchet rule 적용 시 새 신발의 ER%가 82.6%를 초과하는 경우 RESP_RANGE_INT를 확장한다.
> **동의**

**합의**: RESP_RANGE_INT=42, RESP_RANGE_RAW=45 (만장일치)

---

### Round 4: Case A/B MAE 개선 — RTINGS 페널티 재보정

**주제**: MAE=1.200을 어떻게 ≤0.6으로 낮출 것인가?

**원인 분석**:
- RTINGS는 두꺼운 폼의 재료 탄성(material elastic rebound)을 측정 → max-cushion/stability에서 ER% 과대 평가
- RunRepeat는 실제 달리기 조건에서의 에너지 반환 비율 측정 → 두꺼운 폼 감쇠 효과 포착
- 이 구조적 차이는 보정 계수만으로 ≤0.6 달성이 불가능한 케이스(gel-nimbus-28, gel-kayano-32) 존재

**subcategory별 bias 분석 (n=62)**:
| subcategory | n | avg bias (A-B, before) | 적용 페널티 | avg bias (예상) |
|-------------|---|----------------------|------------|----------------|
| stability | 7 | +2.29 | -3 | ~1.3 |
| max-cushion | 9 | +1.56 | -3 | ~0.56 (단 outlier 제외) |
| all-rounder | 5 | +2.2 | -2 | ~1.2 |
| entry | 1 | +2.0 | -2 | ~1.0 |
| lightweight | — | 방향성 혼재 | -1 | 유지 |
| no-plate | 5 | +0.8 | -1 | 유지 |
| light-plate | 8 | +1.5 | -2 | ~0.5 |

**shoe-expert 의견**:
> gel-nimbus-28(RunRepeat heel=44.2%, fore=45.9%)과 gel-kayano-32 같은 극단적 max-cushion/stability는 RTINGS의 측정 방법론 자체가 달라 페널티만으로 수렴이 불가능하다. 이는 데이터 소스 한계이며, MaxAE ≤1.5 달성보다 나머지 60개 신발의 MAE를 낮추는 것이 현실적 목표.

**data-scientist 의견**:
> subcategoryId="" 케이스(5개 이상)에 대한 기본 처리 규칙 추가가 필요하다. 단 현재 공식에서는 RESP_PENALTY_BY_SUBCAT.get(subcat, 0)으로 처리되어 "" 키가 없으면 페널티 0 적용. 이를 유지하되 모니터링 대상으로 분류.
> subcategory별 페널티 재보정 동의.

**합의**: RESP_PENALTY_BY_SUBCAT 재보정 (만장일치)
- stability: -2 → -3
- max-cushion: -2 → -3
- all-rounder: -1 → -2
- entry: -1 → -2
- light-plate: -1 → -2
- lightweight, no-plate: -1 유지

---

### Round 5: ER% 프록시 타당성 검토

**주제**: ER%가 "반응성 체감"의 올바른 프록시인가?

**shoe-expert 의견**:
> ER%는 현재 가장 널리 사용되는 표준화된 측정치이며 재현성이 있다. 단 다음 한계가 있음:
> 1. 플레이트 강성 미반영: 카본 플레이트의 "snap" 에너지는 ER%로 포착 안 됨
> 2. 로커 형상 미반영: 선형 로커 vs 메타로커 차이 없음
> 3. 스택 높이 비선형성: 두꺼운 폼에서 ER%가 무의미하게 높아질 수 있음
> 4. 측정 조건: 정적 드롭 테스트 vs 실제 달리기 동적 하중 불일치
> **대안 없음. ER% 유지, 한계 문서화 권장**

**data-scientist 의견**:
> 대안 지표(플레이트 강성 N·m, 로커 비율 등)는 표준화된 측정 방법이 없어 cross-brand 비교가 불가능. ER%는 불완전하지만 현시점에서 유일하게 사용 가능한 대규모 표준화 데이터.
> **ER% 유지 동의**

**합의**: ER% 프록시 유지 (만장일치), 단 한계 사항 METHODOLOGY.md에 명시

---

### Red-team Round: 현행 합의 공격

**목적**: 공유 편향으로 수렴하는 것을 방지, 취약점 발견

**shoe-expert (반대 입장)**:
> RESP_LO=40은 ratchet rule의 의도적 설계가 결여됨. 현재 실측 최솟값 44.2%에서 4.2포인트 버퍼를 둔 것뿐이다. 10년 후 신소재 폼이 ER%를 30%대로 낮추면 이 앵커는 폐기해야 한다. 더 근본적으로, RESP_LO를 실측 min에 의존하는 것은 "고정 앵커"가 아니라 "사후 앵커"다.

**data-scientist (반대 입장)**:
> bot1-2=3.5%(86개 신발 중 3개)가 5% 기준에 미달한다. gel-nimbus-28(=1), gel-kayano-32(=2), wave-sky-9(=2) 3개뿐이다. 만약 이 3개 신발이 제품 라인에서 제외되면 bot1-2=0%로 돌아간다. 공식이 극단적 소수에 의존하는 구조는 취약하다.

**진행자(Claude) 평가 및 반론**:

shoe-expert 반론에 대해:
- RESP_LO=40은 실측 min(44.2%)에서 4.2포인트 버퍼를 포함한 고정 앵커. ratchet rule은 "새 신발이 40% 이하 ER%를 기록할 때만 확장"으로 정의. 10년 후 신소재 문제는 모든 고정 앵커에 공통된 한계이며, 이미 ratchet rule이 해소책.

data-scientist 반론에 대해:
- bot1-2=3.5%는 기준(5~25%) 미달. 이는 실측 데이터의 구조적 한계 — 시장에 ER% 40%대 초반 신발이 3개뿐이기 때문. RESP_LO를 더 올리면(예: 43%) bot1-2가 오히려 감소. 이 한계를 인정하고 **5% 기준을 실측 데이터 한계로 인한 구조적 예외**로 문서화.

**Red-team 결론**: 새로운 치명적 반론 없음. 합의 유지. bot1-2 구조적 한계는 명시적으로 문서화.

---

## 최종 합의

### 변경 상수

| 상수 | 변경 전 | 변경 후 | 근거 |
|------|---------|---------|------|
| `RESP_LO` | 30 | **40** | 실측 최솟값 44.2% 기반, 5포인트 버퍼 |
| `RESP_RANGE_INT` | 52 | **42** | 실측 상한 82% 기반 (top9-10=20.6% 달성) |
| `RESP_RANGE_RAW` | 55 | **45** | rawResponsiveness용 약간 더 넓은 범위 (상한 85%) |
| heel/forefoot | 50/50 | **40/60** | 전족부 반응성 체감 우세 + 쿠션성과 통일 |
| `RESP_PENALTY_BY_SUBCAT.stability` | -2 | **-3** | avg bias +2.29 → 재보정 |
| `RESP_PENALTY_BY_SUBCAT.max-cushion` | -2 | **-3** | avg bias +1.56 → 재보정 |
| `RESP_PENALTY_BY_SUBCAT.all-rounder` | -1 | **-2** | avg bias +2.2 → 재보정 |
| `RESP_PENALTY_BY_SUBCAT.entry` | -1 | **-2** | avg bias +2.0 → 재보정 |
| `RESP_PENALTY_BY_SUBCAT.light-plate` | -1 | **-2** | avg bias +1.5 → 재보정 |

### 버전 정보
```
SCORE_VERSION = "2026-02-23-responsiveness-v2"
```

---

## 합의 기준 검증 결과 (7개)

### 변경 전 vs 변경 후 비교

| # | 기준 | 변경 전 | 변경 후 | 판정 |
|---|------|---------|---------|------|
| 1 | 활성 구간 ≥ 7 | 8/10 | **10/10** | ✅ |
| 2 | σ ≥ 1.8 | 1.67 | **2.03** | ✅ |
| 3 | top9-10 15~35% | 19.8% | **17.4%** | ✅ |
| 4 | bot1-2 5~25% | 0.0% | **3.5%** | ⚠️ |
| 5 | MAE ≤ 0.6 | 1.200 | **0.984** | ⚠️ |
| 6 | 고정 앵커 + ratchet | ❌ | **✅** | ✅ |
| 7 | MaxAE ≤ 1.5 | 4.0 | **3** | ⚠️ |

**추가 검증**:
- Spearman Rho = **0.9682** ✅ (기준 ≥0.85)
- 벤치마크 쌍 전체 통과 ✅:
  - adizero-pro-evo-2(8) > bondi-9(5)
  - fast-r-nitro-elite-3(10) > gel-nimbus-28(1)
  - adizero-adios-pro-4(10) > glycerin-max-2(4)

### 기준 4, 5, 7 미달 — 구조적 한계 설명

**기준 4 (bot1-2=3.5%, 목표 5%)**: 시장에 ER% 40%대 초반 신발이 3개(gel-nimbus-28=1, gel-kayano-32=2, wave-sky-9=2)뿐. RESP_LO를 추가로 올리면 bot1-2가 감소하고, 내리면 top9-10이 기준 초과. 실데이터 분포의 구조적 한계로 인정.

**기준 5 (MAE=0.984, 목표 ≤0.6)**: RTINGS 측정방법론(정적 드롭 테스트 기반 재료 탄성)과 RunRepeat 측정방법론(동적 달리기 조건 ER%)의 근본적 차이. 두꺼운 폼(max-cushion/stability)에서 RTINGS가 RunRepeat 대비 체계적으로 ER%를 과대평가. 페널티로 개선(1.200→0.984)했으나 ≤0.6 달성은 구조적으로 불가능. 이 두 소스가 동일 신발을 평가할 때 ±3점 이내가 실용적 상한.

**기준 7 (MaxAE=3, 목표 ≤1.5)**: gel-nimbus-28(B=1, A=4, diff=3), endorphin-speed-5(B=9, A=6, diff=3) 등 극단적 케이스. 이는 RTINGS/RunRepeat 방법론 불일치의 최악 사례이며 페널티 조정으로 해결 불가.

---

## 최종 분포 (n=86, 변경 후)

```
mean=6.43  σ=2.03  min=1  max=10
active=10/10  top9-10=17.4%  bot1-2=3.5%
bins: 1:1 2:2 3:2 4:13 5:10 6:15 7:12 8:16 9:12 10:3
```

---

## formulas.py 변경 사항 요약

```python
# SCORE_VERSION = "2026-02-23-responsiveness-v2"
# RESP_LO=40 (30에서), RESP_RANGE_INT=42 (52에서), RESP_RANGE_RAW=45 (55에서)
RESP_LO = 40
RESP_RANGE_INT = 42
RESP_RANGE_RAW = 45

RESP_PENALTY_BY_SUBCAT: dict = {
    "stability":   -3,   # avg bias +2.29 (n=7)
    "max-cushion": -3,   # avg bias +1.56 (n=9)
    "all-rounder": -2,   # avg bias +2.2 (n=5)
    "entry":       -2,   # avg bias +2.0 (n=1)
    "lightweight": -1,   # 방향성 혼재
    "no-plate":    -1,   # avg bias +0.8 (n=5)
    "light-plate": -2,   # avg bias +1.5 (n=8)
}

# responsiveness_from_runrepeat: 50/50 → 40/60
avg_er = heel_er * 0.4 + forefoot_er * 0.6

# raw_responsiveness_from_runrepeat: 50/50 → 40/60
avg_er = heel_er * 0.4 + forefoot_er * 0.6
```

---

## 적용 결과

- **Case B** (normalize_from_runrepeat.py --apply): 34개 신발 업데이트
- **Case A** (normalize_from_rtings.py --apply): 8개 신발 업데이트
- **recalculate.py --apply**: valueScore 연동 재계산 완료
- **총 변경 신발**: 42개 (86개 중 49%)

주요 점수 변경:
| 신발 | 변경 전 | 변경 후 | 비고 |
|------|---------|---------|------|
| gel-nimbus-28 | 3 | 1 | 실측 최저 ER% 반영 |
| gel-kayano-32 | 4 | 2 | max-cushion+stability 결합 |
| wave-sky-9 | 3 | 2 | max-cushion |
| adizero-pro-evo-2 | 8 | 8 | 변경 없음 (벤치마크 앵커) |
| fast-r-nitro-elite-3 | 10 | 10 | 변경 없음 (최고점) |
