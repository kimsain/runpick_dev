# 안정성 점수 재설계 — 멀티 에이전트 토론 (2026-02-23)

## 배경

기존 공식: `round(torsionalRigidity + heelCounterStiffness)`
RunRepeat /5 스케일 단순 합산으로 구조적 강성만 반영.

**문제**: 스택이 높고 폼이 부드러운 신발의 체감 불안정감(sway) 미반영.
대표 사례: vomero-premium(heel_sa=173, stack=55mm) → 구조 점수만으로 9점, 체감과 괴리.

---

## Phase 0: 사전 실증 데이터

적용 전 stability 분포 (86개 신발):

```
bins: 1:0 2:0 3:2 4:3 5:7 6:22 7:25 8:14 9:10 10:3
mean=6.53  sd=1.42  active=8/10  top9-10=15.1%  bot1-2=0%
```

**구조적 문제**: bot1-2=0% (롤백 조건 5-25% 미달), 5-8점에 68개 집중.

---

## 에이전트 토론 요약

### Codex 제안 (biomechanic 역할)

- **hinge 함수 + 임계값 방식**: SA > 130, stack > 40mm 이상에서만 패널티 발생
- 두 팩터가 모두 임계값을 초과할 때 상호작용 항으로 가중 패널티
- 논거: 스택이 높아도 반응성 폼(ER%↑)은 안정적 반환력 제공 → ER% 오프셋 필요

### Gemini 제안 (data-scientist 역할)

- **ER% 오프셋 추가**: 반응성 높은 폼은 착지 시 즉시 복원 → 패널티 상쇄
- 40/60 heel/forefoot 가중 (쿠션·반응성 공식과 통일)
- 상호작용 항 `soft × stk`: 둘 다 높을 때 비선형 가중

### 수용 / 기각

| 항목 | 결정 | 근거 |
|------|------|------|
| Stack × SA 상호작용 항 | ✅ 수용 | 핵심 인과관계 |
| ER% 패널티 오프셋 | ✅ 수용 | 반응성 폼 보정 |
| 70/30 heel/forefoot | ✅ 수용 | 공식 통일성 (쿠션·반응성과 동일) |
| 구조 점수 차감 방식 | ✅ 수용 | 기존 구조 점수 보존 |
| 패널티 상한 명시 | ❌ 기각 | 사용자 판단: vomero-premium 5점이 실제 체감과 부합 |

---

## 최종 합의 공식

```python
# SCORE_VERSION = "2026-02-23-stability-v2"

# 앵커 상수 (ratchet rule)
STAB_SA_LO = 130        # heel SA 임계값
STAB_SA_FO_LO = 125     # forefoot SA 임계값
STAB_STACK_LO = 40      # heel stack(mm) 임계값
STAB_STACK_FO_LO = 30   # forefoot stack(mm) 임계값
STAB_ER_PIVOT = 60      # ER% 오프셋 피벗

def stability_from_runrepeat(tr, hcs,
    heel_sa=None, fore_sa=None,
    heel_er=None, fore_er=None,
    stack_heel=None, stack_fore=None):

    base = tr + hcs  # 구조 점수

    if heel_sa is not None and stack_heel is not None:
        soft_h = max(0, (heel_sa - STAB_SA_LO) / 20)
        soft_f = max(0, (fore_sa - STAB_SA_FO_LO) / 20) if fore_sa else soft_h
        soft = min(1.5, 0.7*soft_h + 0.3*soft_f)

        stk_h = max(0, (stack_heel - STAB_STACK_LO) / 15)
        stk_f = max(0, (stack_fore - STAB_STACK_FO_LO) / 10) if stack_fore else stk_h
        stk = min(1.5, 0.7*stk_h + 0.3*stk_f)

        sway = 0.9*soft + 0.8*stk + 1.2*(soft*stk)

        if heel_er is not None:
            avg_er = heel_er*0.4 + fore_er*0.6 if fore_er else heel_er
            er_offset = max(0, (avg_er - STAB_ER_PIVOT) / 20)
            sway = max(0, sway - er_offset)

        base -= sway

    return clamp(round(base), 1, 10)
```

---

## 주요 신발 결과 (적용 전 → 후)

| 신발 | 기존 | 신규 | 변동 근거 |
|------|------|------|---------|
| adizero-adios-9 | 3 | **3** | SA=119 < 임계값, sway=0 |
| gel-kayano-32 | 10 | **10** | SA=133 (경계), sway=0.15 미미 |
| vomero-premium | 9 | **5** | SA=173/147, stack=55/45 → sway=4.1 |
| neo-vista-2 | 5 | **2** | SA=170, hcs=1(약한 구조) → sway=2.5 |
| bondi-9 | 7 | **6** | SA=146/133, stack=43/38 → sway=1.2 |
| wave-sky-9 | 10 | **9** | SA=143, stack=40 → sway=0.7 |
| vaporfly-4 | 6 | **6** | ER%=76 → er_offset이 sway 상쇄 |

---

## 벤치마크 순위 검증 (필수)

| 쌍 | 결과 | 기대 방향 |
|----|------|---------|
| gel-kayano-32(10) > vaporfly-4(6) | ✓ | 안정화 > 레이싱 |
| vomero-premium(5) < gel-kayano-32(10) | ✓ | 맥스쿠션soft < 안정화 |
| adizero-adios-9(3) < bondi-9(6) | ✓ | 레이싱 < 맥스쿠션 |

---

## 합의 기준 7개 검증 결과

적용 후 stability 분포 (86개):

```
bins: 1:0 2:1 3:4 4:2 5:11 6:35 7:15 8:12 9:5 10:1
mean=6.31  sd=1.47  active=9/10
top9-10=7.0%  bot1-2=1.2%
```

| # | 기준 | 결과 | 판정 |
|---|------|------|------|
| 1 | active ≥ 7 | 9/10 | ✓ |
| 2 | σ ≥ 1.8 | 1.47 | ✗ |
| 3 | top9-10 15~35% | 7.0% | ✗ |
| 4 | bot1-2 5~25% | 1.2% | ✗ |
| 5 | 벤치마크 순위 | 전항 통과 | ✓ |
| 6 | ratchet rule 앵커 | 고정 적용 | ✓ |
| 7 | verify_all_specs | 이상값 0건 | ✓ |

**미달 기준 3개 (σ, top9-10, bot1-2)**: RunRepeat torsional rigidity 값이 대부분 3~5에 집중되어 구조 점수 자체가 5-8 밴드를 형성. Sway 패널티는 상위 점수 일부를 낮추지만 하위 분포 확산에는 한계가 있음. 분포 문제는 이번 공식으로 해결 불가 — 별도 정규화 방식 토론 필요.

---

## formulas.py 변경 사항

- **추가 상수**: `STAB_SA_LO`, `STAB_SA_FO_LO`, `STAB_STACK_LO`, `STAB_STACK_FO_LO`, `STAB_ER_PIVOT`
- **함수 시그니처 변경**: `stability_from_runrepeat(tr, hcs)` → 8-인자 버전 (graceful fallback 포함)
- **normalize_from_runrepeat.py**: SA/ER/stack 6개 인자 추가 전달
