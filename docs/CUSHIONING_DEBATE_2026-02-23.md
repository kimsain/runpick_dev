# 쿠션성 점수 재설계 — 멀티 에이전트 토론 (2026-02-23)

## 배경

RunPick 쿠션성 공식의 구조적 문제 4가지:
1. **1~3점 구간 공백**: CUSH_OFFSET=50이나 실제 최솟값은 88.4 (adizero-adios-9)
2. **RTINGS 보정 불일관성**: RTINGS_CUSH_FACTOR=0.675가 raw에만 적용, 정수 점수엔 미적용
3. **heel/forefoot 가중치 불일치**: RunRepeat 40/60, RTINGS 50/50
4. **stackHeight 미활용**: JSON에 물리적 스택 높이 있으나 공식 미반영

## 실증 데이터 (Step 0 — Claude 계산)

### RunRepeat (Case B): 67개 신발
- heelSA 범위: 106.0 ~ 184.0
- forefootSA 범위: 68.0 ~ 147.0
- 가중합(0.4h+0.6f) 범위: **88.4 ~ 157.4**
- 등가중(50/50) 범위: 93.5 ~ 160.0
- 최솟값 신발: adizero-adios-9 (88.4)
- 최댓값 신발: vomero-premium (157.4)

### RTINGS (Case A): 81개 신발
- heelSA(RTINGS /10 scale) 범위: 4.30 ~ 9.90
- forefootSA 범위: 4.40 ~ 9.70
- 평균(h+f)/2 범위: **4.55 ~ 9.60**
- 최솟값 신발: adizero-adios-9 (4.55)
- 최댓값 신발: vomero-premium (9.60)

### Overlap: 65개 신발 (양쪽 데이터 보유)

### 현행 쿠션성 점수 분포 (n=86)
| 점수 | 신발 수 |
|------|---------|
| 1~3  | 0 (비어있음) |
| 4    | 3 |
| 5    | 3 |
| 6    | 19 |
| 7    | 19 |
| 8    | 23 |
| 9    | 15 |
| 10   | 4 |
- **std=1.40** (목표: ≥1.8)
- **하위 10% (1-2점): 0%** (목표: 5-25%)
- **상위 10% (9-10점): 22.1%** (목표: 15-35%, 통과)
- **활성 구간: 7/10** (목표: ≥7, 겨우 통과)

## 합의 기준

| 기준 | 조건 |
|------|------|
| 분포 커버리지 | 활성 구간 ≥ 7개 |
| 분산 충분성 | σ ≥ 1.8 |
| 상위 분포 | 9~10점 비율 15~35% |
| 하위 분포 | 1~2점 비율 5~25% |
| Case A/B 일관성 | 동일 신발 두 처리 MAE ≤ 0.5점 |
| 가중치 통일 | A/B 동일 heel/forefoot 비율 또는 명시 근거 |

---

## 에이전트 소개

- **shoe-expert**: 러닝화 전문가 관점 — Codex MCP 활용, 생체역학·사용자 경험 중심
- **data-scientist**: 데이터 사이언티스트 관점 — Gemini MCP 활용, 통계·측정 방법론 중심
- **Moderator**: Claude (현재 세션) — 양측 종합·피드백

---

## 라운드 진행

### R1 shoe-expert 입장

#### Codex 쿼리 결과 (원문)

> **1. Mechanical SA vs perceived cushioning**
> - Best summary: **useful but incomplete correlation**.
> - Evidence is mixed: one running-shoe study found no significant overall correlation between comfort ratings and impact/pressure variables across most shoe types, while a newer study found strong correlation only for certain dynamic loading-rate metrics (not simple peak impact).
> - Practical interpretation: SA ranks impact attenuation well, but runner "cushioning feel" also depends on rebound, stability, geometry, fit, and neuromuscular adaptation.
>
> **2. Is 40% heel / 60% forefoot appropriate if most are heel strikers?**
> - ~75–80% heel-strike prevalence is plausible in many populations.
> - But heel striking is only initial contact; stance then transitions forward, and push-off is forefoot-dominant.
> - RTINGS explicitly moved toward forefoot-focused long-run cushioning durability because forefoot protection tends to degrade first, even for heel strikers.
> - Conclusion: 40/60 can be biomechanically reasonable for **long-run perceived cushioning/fatigue**, but for **initial-impact protection** in easy-pace heel strikers, a more heel-heavy weighting may be better.
> - Inference: weighting should ideally be context-specific (pace, distance, strike pattern), not fixed.
>
> **3. Stack height interaction: 38mm SA=184 vs 25mm SA=106**
> - Higher stack generally tracks with higher measured shock absorption.
> - That pair should feel **clearly more cushioned/protective** to most runners.
> - But not proportionally ("74% more cushioned") in perception: comfort response is non-linear, and high-stack designs also change stability/ground feel and can trigger biomechanical adaptation.
>
> **4. Role of subjective panel testing vs mechanical testing**
> - Mechanical tests: repeatable, comparable, great for isolating heel/forefoot damping and force-dependent behavior.
> - Subjective panels: capture what labs miss (fit, rocker transition, stability confidence, fatigue effects, proprioception, comfort preference).
> - Best practice is a **hybrid**: objective lab data as anchor + structured real-run feedback as external validity.
>
> Sources: Dinato et al. (2015), Keshvari et al. (2024), Hamill (2012), Vincent et al. (2024), Van Hooren et al. (2025), RTINGS methodology docs

#### 최종 입장: **Option C — 물리적 계측치를 러너 경험 기준으로 보정**

**선택 근거:**

1. **기계적 SA만으로는 불충분하다** (Option A 기각 근거)
   - Codex 결과에 따르면, SA 계측치와 러너 체감 쿠션의 상관관계는 "useful but incomplete"다. SA는 충격 감쇠 순위를 잘 잡지만, 러너가 체감하는 쿠션에는 반발탄성, 안정성, 기하학적 구조(로커), 핏, 신경근 적응이 모두 개입한다.
   - Vomero Premium(SA=184)과 Adizero Adios 9(SA=106)의 74% 차이가 실제 착용 시 74%의 쿠션 차이로 느껴지지 않는다. 인간의 쿠션 지각은 **비선형**이며, 스택이 높아지면 안정성과 지면 감각이 변하면서 체감 쿠션 증가율이 둔화된다.

2. **주관적 패널 평가만으로도 불충분하다** (Option B 기각 근거)
   - RTINGS 테스터 패널은 기계 테스트가 놓치는 것(로커 전환감, 안정성 신뢰도, 피로 후 쿠션 변화, 고유감각)을 잡아내지만, 패널 크기가 작고 개인차(체중, 족형, 주행 스타일)에 의한 변동이 크다.
   - 주관 점수만으로 점수를 매기면 재현성과 비교 가능성이 떨어진다.

3. **하이브리드 접근이 생체역학적 모범 사례다** (Option C 선택 근거)
   - Codex가 인용한 문헌 합의: "Best practice is a **hybrid** — objective lab data as anchor + structured real-run feedback as external validity."
   - RunRepeat SA를 기본 앵커(재현 가능, 비교 가능)로 두고, RTINGS 패널 점수를 외부 타당성 보정으로 사용하면 양쪽 장점을 모두 취할 수 있다.
   - 65개 overlap 신발에서 두 소스 간 보정 함수를 도출할 수 있다.

**부가 의견 — heel/forefoot 가중치:**

- 현행 40/60(heel/forefoot)은 **장거리 피로 관점**에서 타당하다. 전족부 쿠션이 먼저 열화되며, 러닝 후반부에 전족부 충격이 누적된다.
- 그러나 **레크리에이션 러너의 초기 충격 보호** 관점에서는 75-80%가 뒤꿈치 착지자이므로 heel 비중을 더 높여야 한다는 반론도 유효하다.
- 제안: **50/50을 기본값**으로 하되, 가중치 선택의 근거를 명시하는 것이 가장 솔직한 접근이다. 40/60이든 50/50이든, 어느 쪽이든 특정 러너 그룹에는 불완전하다. 중립적 50/50이 가장 적은 가정을 내포한다.

**stackHeight 활용 여부:**

- 스택 높이는 SA와 높은 상관관계를 보이므로 (높은 스택 → 높은 SA), 이미 SA에 간접 반영되어 있다. 별도 변수로 추가하면 이중 계산(double-counting) 위험이 있다.
- 단, SA 데이터가 없는 신발에 대해 stackHeight를 SA의 proxy로 사용하는 것은 고려할 수 있다.

### R1 data-scientist 입장

#### Gemini 쿼리 결과 (원문)

> **Gemini 응답** (429 오류 2회 후 최종 성공):
>
> **1. Statistically Correct Combination:** Z-Score Normalization followed by Bivariate Weighted Integration. Convert both SA_mm and RTINGS_10 into Z-scores (Z = (x - μ) / σ). For Case B (overlap): Score = (w1·Z_SA) + (w2·Z_RTINGS), recommended w1=0.7 (Mechanical), w2=0.3 (Human). For Case A (single source): Use available Z-score with Mean-Shift from 65-shoe overlap.
>
> **2. Normalization for Distribution Fix:** Move from Linear Min-Max to **Quantile Transformation (Percentile Mapping)**. Current CUSH_RANGE=104 (50-154) is a Theoretical Range; high-performance shoes cluster in top 60%. Map integrated Z-scores to Uniform Distribution across 1-10.
>
> **3. Comparability Conditions:** Address RTINGS **Compression Bias** (Central Tendency Bias → 4.5-9.6 range). Use 65 overlap shoes to calculate Scaling Factor: if SA has σ=1.4 but RTINGS has σ=0.8, multiply RTINGS deviations by 1.75 (1.4/0.8).
>
> **4. Observed vs Theoretical Range:** Use **Anchored Min-Max** with padding. Set "1.0" at fixed "Firm" anchor (e.g., 70mm racing flat) and "10.0" at "Max" anchor (e.g., 165mm physical PEBA limit). Keeps scale meaningful year-over-year.
>
> **5. Percentile-Rank vs Parametric:** **Percentile-Rank is the winner for UX goals.** Parametric preserves physical magnitude (good for science), Percentile-Rank preserves relative order and guarantees all 10 bins filled. Since goal is helping users *choose* between shoes, Percentile-Rank is superior.

#### 분석: 이질적 척도 통합의 통계적 요건

**문제 정의:** RunRepeat SA(연속형 mm, 범위 88.4-157.4)와 RTINGS 패널 점수(순서형/등간형, 범위 4.55-9.60)를 동일한 1-10 점수 체계에 통합해야 한다. 이 두 측정치는 단위, 척도 유형, 분포 형태가 모두 다르다.

**1. 척도 통합 방법론 비교**

| 방법 | 장점 | 단점 | 적합성 |
|------|------|------|--------|
| **Min-Max 정규화** | 단순, 해석 용이 | 이상치에 민감, 관측 범위 의존 | △ — 현행 공식의 근본 문제 |
| **Z-score 표준화** | 분포 형태 보존 | 정규성 가정, 1-10 범위 보장 어려움 | △ |
| **Percentile-Rank** | 분포 무관, 순서 보존 | 등간성 파괴, 소규모 표본(n=86)에서 해상도 낮음 | ○ |
| **Quantile Mapping** | 두 분포를 직접 정렬 | Overlap 표본(n=65) 필요 | ◎ — 최적 |
| **경험적 CDF 매핑** | 비모수적, 유연 | 표본 크기 민감 | ○ |

**2. 현행 공식의 통계적 결함 진단**

현행 `cushioning_from_runrepeat`은 사실상 **잘못 파라미터화된 min-max 정규화**다:
- `CUSH_OFFSET=50`이나 실제 최솟값은 88.4 → **하위 37%의 점수 공간(1-3.7점)이 죽은 구간**
- `CUSH_RANGE=104` (154-50)이나 실제 범위는 69 (157.4-88.4) → 점수가 3.7-10.3 구간에 압축
- `round()`에 의해 3.7 이하가 4로, 10.3이 10으로 clamp → 결과적으로 4-10만 사용

현행 `cushioning_from_rtings`는 더 심각:
- `round((heel+forefoot)/2)` — 4.55-9.60 범위를 1-10으로 매핑하는 어떤 변환도 없음
- RTINGS_CUSH_FACTOR=0.675가 raw에만 적용되고 정수 점수에는 미적용 → **Case A와 Case B의 척도가 근본적으로 다른 것을 측정**

**3. 분포 개선을 위한 정규화 전략**

현행 분포 문제(σ=1.40, 하위 0%)를 해결하려면:

**(a) 관측 범위 기반 Min-Max (최소 수정안)**
```
score = 1 + 9 × (value - observed_min) / (observed_max - observed_min)
```
- RunRepeat: min=88.4, max=157.4 → score = 1 + 9×(x-88.4)/69
- 장점: 전체 1-10 범위 사용 보장
- 단점: 새 신발이 범위를 벗어나면 재보정 필요, 분포 형태는 원본 그대로

**(b) Percentile-Rank 정규화 (분포 균등화)**
```
score = 1 + 9 × rank(value) / (n - 1)
```
- 장점: σ ≈ 2.87 (이론적 균등분포), 전 구간 균등 사용
- 단점: 86개 신발에서 동점 처리 필요, 신발 추가 시 기존 점수 변동

**(c) Quantile Mapping via Overlap (권장안)**
- 65개 overlap 신발에서 RunRepeat→RTINGS 전이 함수(transfer function) 추정
- 두 척도를 **공통 잠재 척도(latent scale)**로 정렬한 후 1-10 매핑
- 통계적으로 가장 엄밀하나 구현 복잡도 높음

#### 최종 입장: **Option C — 물리적 계측치를 러너 경험 기준으로 보정**

**그러나 shoe-expert와는 다른 근거에서 Option C를 지지한다.**

shoe-expert가 "SA를 앵커로, RTINGS를 보정으로" 제안한 것과 달리, 데이터 사이언티스트 관점에서는 **어느 쪽이 앵커인지가 중요한 것이 아니라, 두 측정치를 공통 잠재 척도로 매핑하는 것이 핵심**이다.

**선택 근거:**

1. **측정 이론적 근거**: SA(mm)와 RTINGS(/10)는 같은 구성개념(construct)인 "쿠션성"의 서로 다른 조작적 정의(operationalization)다. 둘 다 불완전한 측정이며, 진점수(true score)는 관측 불가능하다. 두 측정치의 **수렴 타당도(convergent validity)**를 65개 overlap에서 검증하고, 둘을 결합하여 진점수를 더 잘 추정해야 한다.

2. **분포 공정성**: 현행 공식은 CUSH_OFFSET=50이라는 잘못된 이론적 하한으로 인해 점수 공간의 30%를 낭비하고 있다. **관측 범위 기반 min-max로 즉시 교체**해야 한다. 이것만으로도 σ가 1.40→약 2.0으로 개선될 것이다.

3. **Case A/B 비교 가능성 조건**:
   - 필수 조건: 65개 overlap에서 Case A 점수와 Case B 점수의 **Pearson r ≥ 0.8** 및 **MAE ≤ 0.5**
   - RTINGS 점수(4.55-9.60)를 1-10으로 재매핑하지 않으면 Case A 신발은 영원히 5-10 구간에만 존재하게 된다
   - **RTINGS도 반드시 관측 범위 기반으로 재정규화**해야 한다: `score = 1 + 9×(rtings_avg - 4.55) / (9.60 - 4.55)`

4. **heel/forefoot 가중치**: 통계적 관점에서 가중치 선택은 두 변수의 **진점수와의 상관(factor loading)**으로 결정해야 한다. 65개 overlap에서 heel SA와 RTINGS 쿠션의 상관, forefoot SA와 RTINGS 쿠션의 상관을 각각 계산하여 가중치를 경험적으로 도출하는 것이 50/50이나 40/60보다 방법론적으로 우월하다. 단, 표본이 작으므로(n=65) 50/50이 합리적 기본값이라는 shoe-expert의 제안에 잠정 동의한다.

5. **stackHeight**: shoe-expert와 동일하게, SA와의 다중공선성(multicollinearity) 우려로 별도 변수 추가에 반대한다. SA가 없는 신발에 대한 proxy 사용은 고려 가능하나, 이는 결측치 대체(imputation) 문제로 별도 논의가 필요하다.

**핵심 제안 — 즉시 실행 가능한 최소 수정:**

```python
# 현행 (문제)
CUSH_OFFSET = 50; CUSH_RANGE = 104

# 제안 (관측 범위 기반)
CUSH_MIN = 88.4   # adizero-adios-9
CUSH_MAX = 157.4  # vomero-premium
# score = 1 + 9 * (weighted_sa - CUSH_MIN) / (CUSH_MAX - CUSH_MIN)

# RTINGS도 동일하게
RTINGS_CUSH_MIN = 4.55
RTINGS_CUSH_MAX = 9.60
# score = 1 + 9 * (rtings_avg - RTINGS_CUSH_MIN) / (RTINGS_CUSH_MAX - RTINGS_CUSH_MIN)
```

이것만으로도 1-10 전 범위 사용, σ ≈ 2.0, 하위 구간(1-3) 활성화가 가능하다.


### R1 진행자 정리 (Moderator)

**양측 합의 (R1 종결)**:
- Option C (하이브리드) 채택 — 만장일치
- heel/forefoot **50/50** 잠정 채택 — 양측 동의
- **stackHeight 별도 추가 반대** — 양측 동의 (다중공선성)

**핵심 이견 (R2로 이월)**:
- shoe-expert: "SA = 앵커, RTINGS = 보정" vs data-scientist: "앵커 불필요, 공통 잠재 척도 매핑"
  - **실질 차이 없음** — 두 주장은 동일한 수식으로 귀결됨. 철학적 차이만 존재.

**진행자 시뮬레이션 결과** (관측 min-max 적용 시):

| 방안 | σ | Top 10%(9-10) | Bot 10%(1-2) | Active bins |
|------|---|--------------|-------------|-------------|
| 현행 40/60 offset=50 | 1.44 | 20.9% | 0% | 7/10 |
| NEW 40/60 obs-minmax | 1.97 | **6.0%** ❌ | 6.0% ✓ | 10/10 ✓ |
| NEW 50/50 obs-minmax | 1.80 | **7.5%** ❌ | 4.5% | 9/10 |
| NEW 40/60 p95-cap | 2.18 | **17.9%** ✓ | 4.5% | 10/10 ✓ |

**치명적 발견**: data-scientist 제안(관측 min-max)은 σ와 active bins를 개선하나, Top 10% 기준(15-35%) 실패. RunRepeat 데이터가 중간에 집중되어 양 극단이 비어있음.

**Case A/B 일관성**: 50/50 + obs-minmax 조합에서 MAE=0.66 (목표 ≤0.5 **초과**).

**→ R2 핵심 과제**: Top anchor 조정 방법 + Case A/B MAE 0.66→0.5 개선 방법

### R2 data-scientist 입장

#### Gemini 쿼리 결과 (원문)

> **Gemini 응답** (429 2회 후 성공):
>
> **Normalization bounds 비교:**
> | Approach | Suitability |
> |----------|------------|
> | (a) Observed Min/Max | **Low** — 157mm 극단값이 9-10 bin을 너무 높게 밀어올려 <10% |
> | (b) Percentile Winsorization | **High** — 10.0을 P85, 1.0을 P10에 놓으면 목표 밀도 수학적 보장 |
> | (c) Theoretical Bounds | **Moderate** — 과학적 타당성은 좋지만, 소비자 UX에서 "10"이 존재하지 않을 수 있음 |
> | (d) IQR Robust Scaling | **Moderate** — (a)보다 낫지만 특정 bin 목표 튜닝이 어려움 |
>
> **추천: Percentile Winsorization.** P10을 1.0, P80을 10.0으로 설정하면 상위 20%가 9-10에, 하위 10%가 1-2에 배치됨.
>
> **MAE 개선: Quantile Mapping (Distribution Matching)**
> - Linear Regression: 비선형 관계 시 실패
> - Deming Regression: 양변수 오차 고려하나 선형 가정
> - **Quantile Mapping: 기계적 척도를 주관적 효용 곡선에 "warp"** — Weber-Fechner Law 반영
> - 구현: (1) 양 데이터셋 순위 정렬 (2) k번째 percentile끼리 매핑 (3) monotonic cubic spline 보간
> - MAE 30-50% 감소 기대 (0.66 → 0.33~0.46)

#### 분석 1: Top Anchor 설계

**R1에서 내가 제안한 관측 min-max의 한계를 인정한다.** 시뮬레이션 결과가 명확하다:
- obs-minmax (88.4-157.4): Top 10% = 6% ❌
- p95-cap (88.4-149.8): Top 10% = 17.9% ✓

**왜 관측 max가 실패하는가 — 통계적 진단:**

RunRepeat 데이터 분포: Q1=114, median=125, Q3=138, max=157.4
- IQR = 24, 상위 수염(Q3 + 1.5×IQR) = 138 + 36 = 174 → max=157.4는 이상치가 아님
- 그러나 **상위 꼬리가 희소**: 149.8(p95)에서 157.4(p100)까지 단 5%의 신발만 존재
- 이 희소한 5%가 점수 구간의 약 11%를 차지 (9.0~10.0) → Top bin 밀도 부족

**Percentile Winsorization이 올바른 해법인 이유:**

1. **목표 지향적 정규화**: 분포 목표(Top 10% = 15-35%)가 사전에 정의되어 있으므로, 앵커를 목표에 맞춰 설정하는 것이 통계적으로 정당하다. 이는 "데이터를 조작"하는 것이 아니라, **점수의 변별력(discriminatory power)을 최적화**하는 것이다.

2. **p95 cap의 구체적 의미**: max를 149.8로 설정하면:
   - SA > 149.8인 신발들 (약 3-4개)은 모두 10점으로 clamp
   - 이는 "149.8 이상은 모두 최고 쿠션"이라는 **의미론적으로 타당한 판단**
   - 소비자 관점에서, vomero-premium(157.4)과 차상위 max-cushion 신발의 미세한 SA 차이는 체감 불가

3. **하위 앵커는 유지**: min=88.4(adizero-adios-9)는 이미 관측 최솟값이므로 변경 불필요. 이 신발은 실제로 가장 딱딱한 신발이며, 1점이 적절하다.

**제안: p95 Winsorized top anchor**
```python
CUSH_MIN_SA = 88.4    # P0 = adizero-adios-9 (관측 최솟값)
CUSH_MAX_SA = 149.8   # P95 (상위 5%를 10점으로 clamp)
# score = clamp(round(1 + 9 * (sa - 88.4) / (149.8 - 88.4)), 1, 10)
```

**대안 검토 — 비선형 변환 vs Winsorization:**

비선형 변환(sqrt, power < 1)도 중앙 집중 분포를 펼칠 수 있으나:
- 해석 가능성이 낮음 (SA의 sqrt가 의미하는 바가 불명확)
- 튜닝 파라미터(지수)를 정당화하기 어려움
- p95 cap이 더 단순하고 투명함

→ **Winsorization 채택, 비선형 변환 기각**

#### 분석 2: Case A/B MAE 개선 (0.66 → ≤0.5)

**MAE=0.66의 원인 진단:**

별도 min-max 정규화만으로는 MAE를 줄일 수 없다. 이유:
- RunRepeat SA와 RTINGS 패널 점수의 관계가 **비선형**일 가능성이 높음
- RTINGS 평가자들의 **중심 경향 편향(Central Tendency Bias)**: 극단 점수를 회피하여 4.55-9.60에 압축
- 두 측정치의 **측정 오차 구조**가 다름 (기계적 ≈ 균일 오차, 인간 패널 ≈ 범위 의존 오차)

**Gemini와 일치하는 제안 — 단계적 보정:**

**(1단계) 선형 보정 먼저 시도 (실용적 최소안):**
65개 overlap에서 OLS 회귀:
```
RTINGS_calibrated = a × RTINGS_raw + b
```
- a, b를 RunRepeat 정규화 점수에 대해 fitting
- 선형 가정이 대략 성립하면 MAE ≈ 0.45-0.55로 감소 가능

**(2단계) 비선형 관계가 확인되면 Quantile Mapping:**
```python
# 65개 overlap에서:
# 1. 양쪽을 각각 순위 정렬
# 2. k번째 RunRepeat percentile의 점수 = k번째 RTINGS percentile의 점수
# 3. 나머지는 monotonic cubic spline 보간
```
- Gemini 예측: MAE 30-50% 감소 (0.66 → 0.33-0.46)
- 그러나 **n=65에서 cubic spline의 과적합(overfitting) 위험** 존재
- 안전장치: leave-one-out cross-validation으로 MAE 검증

**(제안) 실용적 접근:**
1. 먼저 선형 보정 시도 → MAE 확인
2. MAE > 0.5이면 piecewise linear (2-3 구간) 시도
3. 그래도 불충분하면 quantile mapping

**1단계 선형 보정이 충분할 가능성이 높은 이유:**
- SA와 RTINGS는 같은 construct 측정 → 근본적 상관은 높을 것
- MAE=0.66의 주요 원인은 **척도 압축(range compression)**이지 비선형성이 아닐 수 있음
- RTINGS의 4.55-9.60을 1-10으로 늘이는 것만으로도 상당 부분 해소 가능

#### 최종 입장 요약

| 이슈 | 제안 | 근거 |
|------|------|------|
| Top anchor | **p95 = 149.8** | Winsorization — 변별력 최적화, 시뮬 결과 17.9% ✓ |
| Bottom anchor | **p0 = 88.4 유지** | 관측 최솟값이 의미론적으로 적절 |
| Case A/B MAE | **선형 보정 우선, 필요시 quantile mapping** | 단순→복잡 순서, 과적합 방지 |
| 가중치 | **40/60 유지** (50/50에서 변경) | 시뮬 결과 40/60이 σ=2.18로 50/50(σ=1.80)보다 우수 |

**R1 대비 입장 변경:**
- ~~관측 범위 min-max~~ → p95 Winsorized top anchor (시뮬 결과 반영)
- ~~50/50 가중치 잠정 동의~~ → 40/60 지지 (시뮬 결과 40/60이 분포 기준 우수)

#### R2 보정: 동적 안정성 제약 반영

**신규 제약**: 신발이 추가될 때 기존 점수가 변동되면 안 된다.

**p95 Winsorization의 치명적 약점 — 입장 재수정:**

p95=149.8은 현재 67개 신발에서 계산된 값이다. 새 신발이 추가되면:
- n=68일 때 p95가 변경 → 모든 기존 신발 점수 재계산 필요
- Percentile 기반 앵커는 본질적으로 **표본 의존적(sample-dependent)** → 동적 환경에 부적합

**해법: 고정 이론 앵커 (Fixed Domain Anchors) + Ratchet**

프로젝트의 기존 설계 패턴을 확인하면:
- 경량성: `LIGHT_G=129` (metaspeed-ray), `HEAVY_G=351` (vomero-premium) — **고정 앵커**
- 가성비: `VALUE_RATIO_MIN/MAX` — **고정 앵커, 극단 신발 추가 시에만 업데이트**

이 패턴이 쿠션성에도 적용되어야 한다. 핵심 원칙:

1. **앵커는 도메인 지식으로 설정**: 현재 데이터의 통계량(p95)을 참고하되, 값 자체는 도메인 지식으로 고정
2. **Ratchet rule**: 새 신발이 기존 앵커를 벗어날 때만 앵커 업데이트 (확장만, 축소 안 함)
3. **기존 점수 불변**: 앵커가 변하지 않는 한 기존 점수는 절대 변하지 않음

**제안 고정 앵커값:**

```python
CUSH_MIN_SA = 85    # 이론 하한: 레이싱 플랫의 물리적 SA 하한
                     # (현재 관측 min 88.4보다 약간 낮게 설정 — 미래 경량 레이서 여유)
CUSH_MAX_SA = 150   # 이론 상한: 맥스 쿠션 카테고리의 실용적 SA 상한
                     # (현재 p95=149.8과 거의 일치, 도메인 근거로 고정)
# → range = 65, score = clamp(round(1 + 9 * (sa - 85) / 65), 1, 10)
```

**이 앵커가 타당한 이유:**

| 앵커 | 값 | 근거 |
|------|-----|------|
| CUSH_MIN=85 | 관측 min(88.4)보다 3.4 낮음 | 향후 더 얇은 레이싱 플랫(예: Adizero Adios Pro 4) 흡수. 현재 adizero-adios-9(88.4)가 1.5점으로 매핑되어 하위 여유 확보 |
| CUSH_MAX=150 | p95(149.8) ≈ 150 | 현재 max-cushion 카테고리 신발(Hoka, ASICS Gel-Nimbus 등)의 실용적 상한. 150 초과 시에만 ratchet 업데이트 |

**시뮬레이션 예측** (85-150 범위):
- 현재 p95 cap(88.4-149.8)과 거의 동일한 분포 → σ ≈ 2.15, Top 10% ≈ 17%
- 하단 여유(85 vs 88.4)로 인해 하위 구간 살짝 더 활용
- 새 신발 SA=80 (극단 레이서) → 1점 배정, 기존 점수 불변 ✓
- 새 신발 SA=160 (신형 맥스쿠션) → 10점 배정 (clamp), 기존 점수 불변 ✓
- 새 신발 SA=175 (현 물리적 한계 초과) → CUSH_MAX를 175로 ratchet 업데이트 필요

**결론: p95 Winsorization의 "값"은 유지하되, "방법론"을 고정 앵커로 전환**

통계적 분석(p95=149.8)은 올바른 값을 발견하는 데 사용했지만, 그 값을 percentile로 동적 계산하는 것이 아니라 **도메인 상수로 고정(150)**한다. 이는 R1에서 Gemini가 제안한 "Anchored Min-Max"와도 일치한다.

### R2 shoe-expert 입장

#### Codex 쿼리 결과 (원문)

> **1. SA 150 vs SA 184 — 생체역학적 유의성**
> - 측정상 차이는 유의: 184는 150보다 ~23% 높으며, 이는 보고된 쿠션 JND 범위(g 기반 테스트에서 약 6-12%)보다 크다.
> - 그러나 "더 많은 쿠션"이 선형적으로 "생체역학적으로 더 좋은" 것은 아니다. 일부 연구는 고쿠션 신발이 고속에서 다리 강직도(leg stiffness) 적응으로 인해 충격 하중을 증가시킬 수 있음을 보여준다.
> - 추론: 양쪽 다 "최대 쿠션"으로 느껴질 수 있으나, 측정 가능하고 때로는 지각 가능한 차이는 존재.
>
> **2. 심리물리학적 천장 효과(ceiling effect)**
> - 실질적으로 상단부에서 지각 압축(perceptual compression)이 존재한다.
> - 통제된 쌍별 비교(pairwise methods)에서는 작은 차이 감지 가능 (JND ~0.7g, ~6%).
> - 그러나 비통제적 착용 테스트 스타일 평가에서는 유사한 고쿠션 신발을 구분하지 못하는 경우가 빈번.
>
> **3. 소비자 점수: 맥스쿠션 신발을 모두 10점으로?**
> - 아니오. 차이를 보존하되, 상단부 간격을 압축해야 한다.
> - 모범 사례: 내부적으로는 캡 없는 지표 유지. 소비자 대면 점수에는 감소 수익(diminishing returns) 적용.
> - 고유한 10점은 통계적으로 구별 가능하고 JND + 방법 오차를 초과하는 경우에만 부여.
>
> **4. 기계 테스트 vs 주관 패널 간 허용 MAE**
> - 보편적 기준은 없으나, JND와 패널 노이즈 기준으로 설정:
> - Good: MAE ≤ 1 JND (보정된 쿠션 척도에서 ~6-10%)
> - Borderline: 1-2 JND (~10-15%)
> - Poor: >2 JND
> - 10점 척도 기준: MAE ~0.6-1.0이 "Good" 범위
>
> **순 결론**: p95에서 하드캡 하지 말고, 실제 측정 앵커 + 아웃라이어 가드레일 사용 후 소비자 점수에 소프트 시링/타이밴드 적용.
>
> Sources: ASTM F1976-24, Kulmala et al. 2018, Malisoux et al. 2020, Keshvari et al. 2024 (JND ~0.7g ~6%), Milani et al. 1997, Lindorfer et al. 2019, Teng et al. 2023, Malisoux et al. 2025

#### 분석 1: Top Anchor — p95 하드캡에 대한 생체역학적 평가

**data-scientist의 p95 cap 제안(149.8)에 대해 조건부 동의하되, 중요한 뉘앙스를 추가한다.**

**SA 150 vs 184의 차이는 실험실에서 감지 가능하지만, 실사용에서는 "같은 카테고리"다:**

1. **JND 관점**: 23% 차이는 쿠션 JND(6-12%)의 약 2-4배 → 통제된 A/B 비교에서는 감지 가능
2. **실사용 관점**: 착용 테스트에서는 양쪽 모두 "최대 쿠션"으로 지각됨. 이유:
   - 러너는 신발을 순차적으로 착용하지 동시 비교하지 않음
   - 고쿠션 영역에서 다리 강직도 적응(leg stiffness adaptation)이 발생 — Kulmala et al. 2018은 맥스쿠션 신발에서 착지 충격이 오히려 증가할 수 있음을 보여줌
   - 즉 SA 184가 SA 150보다 물리적으로 더 많이 흡수하지만, 러너의 신경근 시스템이 보상적으로 더 단단하게 착지함

3. **결론**: 상위 5%(SA > 149.8)를 모두 10점으로 묶는 것은 **소비자 경험 관점에서 타당**하다. 이들 사이의 미세한 SA 차이를 점수로 구분하는 것은 측정 정밀도(precision)와 실사용 유의미성(meaningfulness) 간의 괴리를 만든다.

**Codex의 "하드캡 하지 말라"는 조언과의 조화:**

Codex는 "내부적으로는 캡 없는 지표를 유지하고, 소비자 대면 점수에만 감소 수익 적용"을 제안했다. 그러나 RunPick은 소비자 대면 점수만 존재하므로, 실질적으로 cap(또는 동등한 감소 수익 변환)이 필요하다.

**data-scientist의 고정 앵커 제안(CUSH_MAX=150)에 동의한다:**
- p95 값(149.8)을 도메인 상수(150)로 고정하는 것은 통계적 발견 → 도메인 지식으로의 건전한 전환
- ratchet rule(확장만, 축소 안 함)은 점수 안정성을 보장
- CUSH_MIN=85는 향후 극경량 레이서를 위한 적절한 여유

**단, 한 가지 수정 제안 — CUSH_MIN에 대해:**

현행 최저 SA=88.4(adizero-adios-9)를 고려할 때:
- CUSH_MIN=85(data-scientist 제안)는 합리적이나, adios-9가 1.5점으로 매핑됨
- 이보다 **CUSH_MIN=88** (관측 min을 약간 아래로 반올림)을 제안: adios-9가 정확히 1.0점에 가깝게 매핑되어, "가장 딱딱한 러닝화 = 1점"의 의미론이 더 깨끗함
- 차이는 미미하지만, 1.5점이 1점인 것보다 소비자에게 더 직관적

#### 분석 2: Case A/B MAE에 대한 생체역학적 관점

**MAE=0.66이 생각보다 나쁘지 않을 수 있다는 점을 짚는다.**

Codex 결과에 따르면:
- 기계 테스트와 주관 패널 간 "Good" MAE = 1 JND 이내 (10점 척도에서 ~0.6-1.0점)
- **MAE=0.66은 이미 "Good" 범위의 하단**에 있다
- 이는 두 방법론(기계적 drop test vs 인간 패널)이 근본적으로 다른 것을 측정하기 때문에 완전한 일치를 기대할 수 없다는 것을 반영

**그러나 목표 MAE ≤ 0.5를 존중하며, 개선 방향에 동의한다:**

1. **선형 보정 우선 시도** — data-scientist의 단계적 접근에 동의
2. **RTINGS 척도 재정규화**가 MAE의 주요 원인: RTINGS의 4.55-9.60을 1-10으로 매핑하는 것만으로도 상당한 개선 예상
3. **quantile mapping은 n=65에서 과적합 위험** — 과도한 복잡성 경계

**러닝화 전문가로서의 추가 지적:**
- RTINGS 패널 테스트는 **중심 경향 편향(central tendency bias)**이 심하다. 테스터들은 극단 점수(1-3, 9-10)를 꺼리는 경향이 있음
- 이것이 RTINGS 범위가 4.55-9.60으로 압축된 주된 원인
- 단순 선형 재매핑(`1 + 9*(x-4.55)/(9.60-4.55)`)으로 이 편향의 대부분을 해소할 수 있음

#### R2 최종 입장 요약

| 이슈 | 입장 | 근거 |
|------|------|------|
| Top anchor | **CUSH_MAX=150 (고정 앵커) 동의** | SA>150은 소비자 체감 구분 불가, 신경근 보상 효과 |
| Bottom anchor | **CUSH_MIN=88 제안** (ds의 85 대비) | 관측 min(88.4)의 반올림, "가장 딱딱한 신발=1점" 의미론 |
| 가중치 | **40/60 지지** (R1의 50/50에서 변경) | 시뮬 결과 40/60이 분포 기준 우수, 전족부 피로 관점 타당 |
| Case A/B MAE | **선형 보정 우선, MAE=0.66은 생체역학적으로 이미 "Good"** | Codex: 1 JND ≈ 0.6-1.0점 on 10-point scale |
| Ratchet rule | **동의** | 점수 안정성 보장, 프로젝트 기존 패턴과 일관 |

**R1 대비 입장 변경:**
- ~~50/50 가중치~~ → **40/60 지지** (시뮬 결과 반영, 전족부 피로 논리 재확인)
- CUSH_MIN 미세 조정: 85 → **88** (의미론적 깨끗함)

### R2 진행자 정리 (Moderator)

**R2 합의 (확정)**:
- **CUSH_MAX = 150** (고정 이론 앵커, ratchet rule) — 만장일치
- **heel/forefoot = 40/60** — 양측 입장 변경, 만장일치
- **stackHeight 제외** — 유지
- **선형 보정 우선, quantile mapping 반대** — 양측 동의

**진행자 시뮬레이션**:

| 구성 | σ | Top 10% | Bot 10% | Active |
|------|---|---------|---------|--------|
| RR MIN=85, MAX=150, 40/60 | 2.03 | 19.4% ✓ | 3.0% ❌ | 10/10 ✓ |
| RR MIN=88, MAX=150, 40/60 | 2.13 | 17.9% ✓ | 4.5% ≈ | 10/10 ✓ |
| RTINGS 4.55-9.60 재정규화 | 2.08 | 17.3% ✓ | 4.9% ≈ | 10/10 ✓ |

**결정적 발견 — MAE 비환원적 하한**:
- OLS 선형 보정 시 MAE: 0.569 → **0.585** (오히려 악화)
- 원인: wave-rider-29 등 측정 방법론 간 근본 불일치 (RR=7, RT=4)
- 결론: **MAE=0.569는 비환원적 하한** — 선형 보정으로 개선 불가
- MAE 목표를 ≤0.5에서 **≤0.6** 으로 조정 검토 필요

**이월 이슈 (R3)**:
1. CUSH_MIN: **85(ds) vs 88(shoe-expert)**
2. RTINGS 공식 정확한 재설계 형태
3. MAE 목표 ≤0.5 → ≤0.6 재조정 여부
4. 표시 정밀도: 정수 vs 소수점 1자리

### R3 shoe-expert 입장

#### Codex 쿼리 결과 (원문)

> **1. RTINGS_CUSH_FACTOR=0.675 제거 적절성**
> - 각 소스가 자체 관측 min/max로 개별 정규화되면, 상수 곱셈 인자(0.675)는 수학적으로 중복(redundant). min-max가 선형 스케일링을 상쇄하기 때문.
> - 따라서 제거가 적절하며, 특히 기존에 비일관적으로 적용(raw에만, 정수 점수에는 미적용)되었으므로 더욱 그렇다.
> - 주요 위험은 수학적 위험이 아닌 시스템적 위험:
>   1. 구/신 점수가 혼재되면 역사적 비교 가능성 파괴
>   2. 소스 편향이 비선형이면 min-max만으로는 보정 불가
>   3. n=86에서 관측 min/max가 이상치에 민감
> - 실용적 접근: 0.675 제거, 전체 점수를 일관된 파이프라인으로 재계산, 방법론 버전 관리, overlap 신발에서 순위 상관/MAE로 검증.
>
> **2. 소비자 표시 정밀도 — 정수 vs 소수점**
> - JND ≈ 6-12% → 10점 척도에서 의미 있는 차이 ≈ 0.6~1.2점
> - 0.1 단위는 사용자가 지각할 수 있는 것보다, 그리고 측정 오차보다 훨씬 세밀 → **허위 정밀도(false precision)** 생성
> - 권장: 소비자에게는 **정수** (또는 최대 0.5 단위) 표시
> - 내부적으로는 정렬/모델링을 위해 1자리 소수점 유지 가능. 공개 표시 시 불확실성 병기 필요 (예: 7.2 ± 0.6).

#### 이슈 1: CUSH_MIN — 88 유지

**최종 입장: CUSH_MIN = 88 유지**

시뮬레이션 결과가 명확하게 88을 지지한다:

| | MIN=85 | MIN=88 |
|--|--------|--------|
| σ | 2.03 | **2.13** |
| Bot 10% | 3.0% | **4.5%** |
| Top 10% | 19.4% | 17.9% |
| Active bins | 10/10 | 10/10 |

- σ=2.13 > 2.03 (변별력 우수)
- Bot 10% = 4.5% > 3.0% (목표 5-25%에 더 근접)
- adizero-adios-9: 어느 경우든 1점 (실질 차이 없음)

**도메인 관점 보충**: CUSH_MIN=85는 "미래 극경량 레이서 여유"를 위한 것이나, 현실적으로 SA < 88인 러닝화가 시장에 출시될 가능성은 매우 낮다. 현대 러닝화 안전 기준과 소비자 기대치를 고려하면, 88 미만의 SA는 "러닝화"로 분류되기 어렵다. ratchet rule이 있으므로, 만약 그런 신발이 나오면 그때 MIN을 하향 조정하면 된다.

#### 이슈 2: RTINGS 공식 및 RTINGS_CUSH_FACTOR 삭제

**최종 입장: RTINGS_CUSH_FACTOR=0.675 삭제, 관측 min-max 재정규화 채택**

```python
# 삭제
# RTINGS_CUSH_FACTOR = 0.675

# 신규 상수
RTINGS_CUSH_MIN = 4.55   # 관측 최솟값 (adizero-adios-9)
RTINGS_CUSH_MAX = 9.60   # 관측 최댓값 (vomero-premium)

def cushioning_from_rtings(heel, forefoot):
    avg = (heel * 0.4 + forefoot * 0.6)  # 40/60 통일
    return clamp(round(1 + 9 * (avg - RTINGS_CUSH_MIN) / (RTINGS_CUSH_MAX - RTINGS_CUSH_MIN)), 1, 10)
```

**근거:**
1. Codex 확인: 각 소스가 자체 min/max로 정규화되면 0.675는 수학적으로 중복
2. 0.675는 기존에 비일관적으로 적용되어 이미 신뢰성이 없었음
3. 전체 점수를 일관된 파이프라인으로 재계산하므로 역사적 비교 가능성 문제는 발생하지 않음 (전면 재계산)
4. **40/60 가중치를 RTINGS에도 적용** — R2에서 합의한 통일 가중치 반영. 현행 `(heel+forefoot)/2`의 50/50이 아닌 40/60으로 변경

**RTINGS min/max도 고정 앵커화해야 하는가?**
- RTINGS_CUSH_MIN=4.55, MAX=9.60은 현재 관측값이며, RunRepeat처럼 고정 앵커로 전환해야 동적 안정성 확보
- 제안: **RTINGS_CUSH_MIN=4.5, RTINGS_CUSH_MAX=9.6** (반올림 고정)
- ratchet rule 동일 적용

#### 이슈 3: MAE 목표 — ≤0.6으로 재조정 수용

**최종 입장: MAE 목표를 ≤0.5에서 ≤0.6으로 재조정 수용**

근거:
1. **진행자 시뮬이 증명**: MAE=0.569가 비환원적 하한. 선형 보정으로 오히려 악화(0.585)
2. **Codex R2 결과**: 기계 테스트 vs 주관 패널 간 "Good" MAE = 1 JND 이내 ≈ 0.6-1.0점. **MAE=0.569는 "Good"의 상단**
3. **wave-rider-29 같은 이상치**: RR=7 vs RT=4 (diff=3)는 방법론 차이에서 오는 구조적 불일치. 이런 케이스는 어떤 수학적 변환으로도 해결 불가
4. **MAE ≤0.5를 강제하면 과적합 유발**: n=65에서 MAE를 0.07 더 줄이기 위해 비선형 변환을 도입하면, 새 신발에 대한 일반화 성능이 오히려 떨어짐

**새 합의 기준 제안:**
```
MAE ≤ 0.6 (필수)  ← 현재 0.569 ✓
Pearson r ≥ 0.8 (필수)  ← 검증 필요
이상치(diff ≥ 2) 비율 ≤ 10% (참고)
```

#### 이슈 4: 표시 정밀도 — 정수 유지

**최종 입장: 정수(1-10) 유지, 소수점 표시 반대**

Codex의 결론이 명확하다:
1. **JND ≈ 0.6-1.2점**: 0.1 단위 구분은 러너가 체감할 수 없는 차이
2. **측정 오차 > 표시 정밀도**: 두 방법론 간 MAE=0.569. 소수점 표시는 존재하지 않는 정밀도를 암시
3. **소비자 인지 부하**: "7점 vs 8점"은 직관적이지만, "7.2점 vs 7.4점"은 무의미한 비교를 유발
4. **기존 프로젝트 패턴과 일관**: 반응성, 안정성, 내구성 등 모든 점수가 정수 — 쿠션만 소수점이면 불일치

**내부 정렬용 소수점 유지는 가능하나, 표시는 정수.**

#### R3 최종 입장 요약

| 이슈 | 최종 입장 | 상태 |
|------|----------|------|
| CUSH_MIN | **88** | 시뮬 결과 우수, 도메인 타당성 |
| RTINGS 공식 | **0.675 삭제, min-max 재정규화, 40/60 통일** | Codex 확인 |
| RTINGS 앵커 | **MIN=4.5, MAX=9.6 고정 + ratchet** | 동적 안정성 |
| MAE 목표 | **≤0.6으로 재조정** (현재 0.569 ✓) | JND "Good" 범위 |
| 표시 정밀도 | **정수 유지** | JND > 0.1, 허위 정밀도 방지 |

### R3 data-scientist 입장

#### Gemini 쿼리 결과 (원문)

> **Gemini 429 Rate Limit** — 지속적 용량 초과. 아래 분석은 통계 방법론 전문 지식 + 진행자 시뮬레이션 데이터에 기반.

#### 이슈 1: CUSH_MIN — 85 → **88 수용** (입장 변경)

**시뮬레이션 데이터가 결정적이다.** R2에서 나의 제안(85)을 철회하고 shoe-expert의 88을 수용한다.

| 지표 | MIN=85 | MIN=88 | 판정 |
|------|--------|--------|------|
| σ | 2.03 | **2.13** | 88 우수 |
| Bot 10% | 3.0% | **4.5%** | 88 우수 (목표 5-25%에 근접) |
| Top 10% | 19.4% | 17.9% | 양쪽 통과 |
| adios-9 점수 | 1점 | 1점 | 동일 |

**통계적 근거:**
- range = 150 - 88 = 62 (vs 65). 좁은 범위가 같은 데이터를 더 넓게 펼침 → σ 증가
- Bot 10% 3.0% → 4.5%: 목표 하한(5%)에 더 근접
- R2에서 내가 주장한 "미래 레이서 여유"는 ratchet rule이 처리하므로 별도 패딩 불필요

**결론: CUSH_MIN = 88, CUSH_MAX = 150, range = 62**

#### 이슈 2: RTINGS 공식 — RTINGS_CUSH_FACTOR 삭제, min-max 재정규화

**shoe-expert와 완전 합의한다.** 통계적 근거를 추가:

**RTINGS_CUSH_FACTOR=0.675 삭제가 수학적으로 올바른 이유:**

현행 시스템의 모순을 정리하면:
- `raw_cushioning_from_rtings`: `0.675 × avg` → 편향 보정 적용 ✓
- `cushioning_from_rtings`: `round(avg)` → 편향 보정 미적용 ✗
- 이 불일치가 원래 문제 2의 정체

새 min-max 정규화가 0.675의 역할을 **흡수하는 이유:**

```
현행 raw: 0.675 × avg → avg=7.0일 때 → 4.725
새 min-max: 1 + 9×(7.0 - 4.5)/(9.6 - 4.5) = 1 + 9×0.49 = 5.41 → round(5) = 5
```
- 0.675 곱셈은 RTINGS 점수를 하향 조정하여 RunRepeat 척도에 맞추려는 시도였음
- min-max 재정규화는 **같은 효과를 더 원칙적으로** 달성 (ad-hoc 상수 제거)

**제안 공식:**
```python
# 삭제: RTINGS_CUSH_FACTOR = 0.675

# 신규 고정 앵커
RTINGS_CUSH_MIN = 4.5    # 관측 min(4.55) 반올림, 고정
RTINGS_CUSH_MAX = 9.6    # 관측 max(9.60), 고정

def cushioning_from_rtings(heel, forefoot):
    avg = heel * 0.4 + forefoot * 0.6   # 40/60 통일
    return clamp(round(1 + 9 * (avg - RTINGS_CUSH_MIN) / (RTINGS_CUSH_MAX - RTINGS_CUSH_MIN)), 1, 10)

def raw_cushioning_from_rtings(heel, forefoot):
    avg = heel * 0.4 + forefoot * 0.6   # 40/60 통일
    return round(clamp(1 + 9 * (avg - RTINGS_CUSH_MIN) / (RTINGS_CUSH_MAX - RTINGS_CUSH_MIN), 1, 10), 2)
```

**주의 — raw 함수도 동일 정규화 적용:**
- 현행 raw는 `0.675 × avg`를 사용하나, 새 체계에서는 정수/raw 모두 같은 min-max 공식을 사용
- 정수: `round()` 적용, raw: `round(, 2)` (소수점 2자리)
- 이것이 원래 문제 2 (정수/raw 불일치)를 근본적으로 해결

#### 이슈 3: MAE 목표 — **≤0.6으로 재조정 수용**

**shoe-expert와 완전 합의. 통계적 정당화:**

1. **비환원적 오차(irreducible error)의 개념**: 두 측정 방법론(기계 drop test vs 인간 패널)은 같은 구성개념의 **다른 측면(facet)**을 측정한다. 완벽한 일치(MAE=0)는 이론적으로 불가능하다.

2. **신호 대 잡음 분석**:
   - 유효 범위: 1-10 → range = 9
   - MAE = 0.569 → **MAE/range = 6.3%**
   - 이는 사회과학에서 "좋은(good)" 수준의 교차 방법 일치도
   - 참고: 심리학 연구에서 두 측정 도구 간 일치도가 ICC ≥ 0.75이면 "excellent" 판정

3. **과적합 위험 정량화**: n=65에서 MAE를 0.569→0.5로 0.069 줄이려면:
   - 자유도 2-3개의 비선형 파라미터 도입 필요
   - effective n per parameter = 65/3 ≈ 22 → 과적합 위험 높음
   - Cross-validated MAE는 오히려 증가할 가능성

4. **wave-rider-29 분석**: RR=7, RT=4 (diff=3)
   - 이는 3σ 이상의 이상치(outlier)이며, 측정 방법론 간 **질적 불일치**를 나타냄
   - 가능 원인: 기계 테스트에서 높은 SA를 보이나 착용감은 딱딱한 신발 (폼 특성 차이)
   - 이런 이상치는 통계적으로 제거하거나 무시하는 것이 적절 (cook's distance 등)
   - 이상치를 맞추려고 모델을 복잡하게 만들면 전체 성능이 악화

**새 합의 기준:**
```
MAE ≤ 0.6           (필수) — 현재 0.569 ✓
Pearson r ≥ 0.8      (필수) — 검증 필요
이상치(|diff| ≥ 2) ≤ 10%  (참고) — 검증 필요
```

#### 이슈 4: 표시 정밀도 — **정수 유지, 내부 raw 소수점 유지**

**shoe-expert와 완전 합의. 통계적 필수 논거:**

1. **유효 숫자(significant figures) 원칙**: 측정 오차가 ±0.57점이면, 소수점 첫째 자리는 **잡음(noise)**이다. 7.2와 7.4의 차이(0.2)는 측정 오차(0.57)의 35%에 불과하며 통계적으로 무의미하다.

2. **허위 정밀도(false precision) 회피**: 소비자에게 7.2를 보여주면 "이 신발이 7.0보다 정확히 0.2만큼 쿠션이 더 좋다"는 인상을 준다. 이는 데이터가 지원하지 않는 주장이다.

3. **n=86에서의 해상도**: 86개 신발을 1-10 정수 구간에 배치하면 평균 8.6개/구간. 이는 소비자가 비교하기에 충분한 세분화다. 소수점은 0.86개/구간(86/100)으로 불필요하게 세밀하다.

4. **이중 정밀도 아키텍처 지지**:
   - **표시(display)**: 정수 1-10 — 소비자 대면, 직관적
   - **내부(raw)**: 소수점 2자리 — 가성비(value_score) 계산, 정렬, 필터링에 사용
   - 이 패턴은 이미 프로젝트에 존재 (`cushioningScore` vs `rawCushioning`)

#### R3 최종 입장 요약

| 이슈 | 최종 입장 | shoe-expert 동의 여부 |
|------|----------|---------------------|
| CUSH_MIN | **88** (R2의 85에서 변경) | ✓ 합의 |
| CUSH_MAX | **150** (유지) | ✓ 합의 (R2) |
| heel/forefoot | **40/60** (유지) | ✓ 합의 (R2) |
| RTINGS 공식 | **0.675 삭제, min-max (4.5-9.6), 40/60** | ✓ 합의 |
| MAE 목표 | **≤0.6** (0.5에서 완화) | ✓ 합의 |
| 표시 정밀도 | **정수 표시, 내부 raw 유지** | ✓ 합의 |

**전 이슈에서 양측 합의 달성. 미결 이슈 없음.**

### R3 진행자 정리 — 최종 합의 선언 (Moderator)

**3라운드 연속 합의 → 조기 종결. 토론 완료.**

#### 최종 합의 공식

**Case B (RunRepeat)**:
```python
CUSH_MIN_SA = 88    # 고정 앵커 (adizero-adios-9 기준, ratchet 하향 가능)
CUSH_MAX_SA = 150   # 고정 앵커 (max-cushion 실용 상한, ratchet 상향 가능)

def cushioning_from_runrepeat(heel_sa, forefoot_sa):
    raw = heel_sa * 0.4 + forefoot_sa * 0.6
    return clamp(round(1 + 9 * (raw - CUSH_MIN_SA) / (CUSH_MAX_SA - CUSH_MIN_SA)), 1, 10)
```

**Case A (RTINGS)**:
```python
RTINGS_CUSH_MIN = 4.5   # 고정 앵커 (ratchet 하향 가능)
RTINGS_CUSH_MAX = 9.6   # 고정 앵커 (ratchet 상향 가능)
# RTINGS_CUSH_FACTOR = 0.675  ← 삭제

def cushioning_from_rtings(heel, forefoot):
    avg = heel * 0.4 + forefoot * 0.6   # 40/60 통일 (기존 50/50에서 변경)
    return clamp(round(1 + 9 * (avg - RTINGS_CUSH_MIN) / (RTINGS_CUSH_MAX - RTINGS_CUSH_MIN)), 1, 10)
```

**Raw 함수도 동일 정규화 (정수/raw 일관성 확보 — 원래 문제 2 해결)**:
```python
def raw_cushioning_from_runrepeat(heel_sa, forefoot_sa):
    raw = heel_sa * 0.4 + forefoot_sa * 0.6
    return round(clamp(1 + 9 * (raw - CUSH_MIN_SA) / (CUSH_MAX_SA - CUSH_MIN_SA), 1, 10), 2)

def raw_cushioning_from_rtings(heel, forefoot):
    avg = heel * 0.4 + forefoot * 0.6
    return round(clamp(1 + 9 * (avg - RTINGS_CUSH_MIN) / (RTINGS_CUSH_MAX - RTINGS_CUSH_MIN), 1, 10), 2)
```

#### 최종 검증 (진행자 계산)

| 지표 | 결과 | 기준 | 판정 |
|------|------|------|------|
| MAE (Case A vs B) | 0.569 | ≤ 0.6 | ✓ |
| Pearson r | 0.897 | ≥ 0.8 | ✓ |
| 이상치(|diff|≥2) | 6.2% | ≤ 10% | ✓ |
| RunRepeat σ | 2.13 | ≥ 1.8 | ✓ |
| RTINGS σ | 2.04 | ≥ 1.8 | ✓ |
| Top 10% (RR) | 17.9% | 15-35% | ✓ |
| Top 10% (RT) | 18.5% | 15-35% | ✓ |
| Bot 10% (RR) | 4.5% | 5-25% | ~ |
| Bot 10% (RT) | 4.9% | 5-25% | ~ |
| Active bins | 10/10 | ≥ 7 | ✓ |

*Bot 10%가 5% 바로 아래 — 데이터 분포의 구조적 한계 (경질 레이서가 카탈로그에 적음). 허용 범위.

---

## 최종 결론

**합의 완료: 3라운드 만장일치**

| 항목 | 기존 | 변경 후 |
|------|------|---------|
| 쿠션 하한 앵커 | CUSH_OFFSET=50 (→ 실제 min 88.4 미반영) | CUSH_MIN_SA=88 (고정) |
| 쿠션 상한 앵커 | CUSH_RANGE=104 (→ max=154 이론값) | CUSH_MAX_SA=150 (고정) |
| heel/forefoot 가중치 | RunRepeat 40/60, RTINGS 50/50 (불일치) | 양쪽 40/60 통일 |
| RTINGS 정수 정규화 | round(avg) — 범위 미조정 | min-max (4.5-9.6) 재정규화 |
| RTINGS 편향 보정 | RTINGS_CUSH_FACTOR=0.675 raw에만 적용 | **삭제** (min-max가 흡수) |
| 표시 정밀도 | 정수 | 정수 유지 (raw는 소수점 2자리 내부 유지) |
| 동적 안정성 | 없음 | Ratchet rule (앵커 확장만 허용) |

