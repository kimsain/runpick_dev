# 정규화 스크립트 재실행 보고서
**실행일**: 2026-02-20

---

## 요약

| 구분 | 처리 | 변경 |
|------|------|------|
| Case B (RunRepeat+RTINGS) | 61개 | **59개** |
| Case A (RTINGS-only) | 15개 | **6개** |
| valueScore 재계산 | 86개 | **21개** |
| Case C (리뷰만) | — | **미적용** (수동 검토 필요) |

**총 76개 신발 처리, 65개 점수 변경, 21개 valueScore 연동 변경**

---

## 주요 발견: 구조적 편향

기존 brands.json의 주요 오류 패턴:

### 1. 안정성(stability): 기본값 10 과다 할당
많은 신발의 stability가 10으로 고정돼 있었음 (RunRepeat 측정 이전 수동 입력값 잔존).
RunRepeat torsionalRigidity + heelCounterStiffness 실측값으로 교체.

**대폭 하락한 신발** (10 → 낮은 값):
- adizero-evo-sl: 10 → 7
- adizero-boston-13: 10 → 9
- gel-nimbus-28: 10 → 9
- novablast-5: 10 → 7
- superblast-2: 10 → 8
- ghost-17 / ghost-max-3 / glycerin-22 / hyperion-3 / hyperion-max-3: 10 → 7~8
- arahi-8 / bondi-9 / clifton-10: 10 → 7~8
- wave-rebellion-flash-3: 10 → 7
- pegasus-41 / vomero-18 / vomero-plus / structure-26 / pegasus-plus / zoom-fly-6: 10 → 6~9
- 다수의 Saucony 모델 (triumph, guide, hurricane, endorphin-speed): 10 → 8
- foreverrun-nitro-2: 9 → 4

### 2. 내구성(durability): 기본값 6 과다 할당
RTINGS 아웃솔 측정 전 기본값 6이 잔존해 있던 신발들이 실측값으로 교체.

**크게 오른 신발** (내구성 실측치 우수):
- glycerin-22: 6 → 10 (두꺼운 아웃솔)
- arahi-8: 6 → 10
- gel-kayano-32: 9 → 10 (공식 보정 기준값)
- tempus-2: 6 → 10
- adizero-adios-9 / streakfly-2: 3 → 5

**크게 내린 신발** (내구성 실측치 취약):
- wave-sky-9: 9 → 5
- adizero-pro-evo-2: **5 → 1** ← 보고된 버그
- adizero-takumi-sen-11: 6 → 4
- hyperion-elite-5: 6 → 4
- vaporfly-4: 3 → 2
- alphafly-3: 4 → 3
- velocity-nitro-4: 10 → 7

---

## 신발별 상세 변경 내역

### ADIDAS (Case B)
| 신발 | stability | durability |
|------|-----------|------------|
| adizero-adios-9 | 2 → 3 | 3 → 5 |
| adizero-adios-pro-4 | 4 → 5 | 5 → 4 |
| adizero-boston-13 | 10 → 9 | — |
| adizero-evo-sl | 10 → 7 | 5 → 7 |
| adizero-prime-x3-strung | 8 → 6 | 5 → 4 |
| **adizero-pro-evo-2** | **8 → 6** | **5 → 1** |
| adizero-takumi-sen-11 | 7 → 5 | 6 → 4 |

### ASICS (Case B)
| 신발 | stability | durability |
|------|-----------|------------|
| gel-kayano-32 | — | 9 → 10 |
| gel-nimbus-28 | 10 → 9 | 10 → 7 |
| megablast | — | 6 → 7 |
| metaspeed-edge-tokyo | 5 → 6 | 4 → 5 |
| metaspeed-ray | 3 → 4 | — |
| metaspeed-sky-tokyo | 5 → 6 | — |
| novablast-5 | 10 → 7 | 7 → 8 |
| sonicblast | 9 → 7 | — |
| superblast-2 | 10 → 8 | — |
| yogiri-s4-plus | 6 → 7 | 6 → 4 |

### BROOKS (Case B)
| 신발 | stability | durability |
|------|-----------|------------|
| ghost-17 | 10 → 8 | 6 → 9 |
| ghost-max-3 | 10 → 8 | 6 → 8 |
| glycerin-22 | 10 → 7 | 6 → 10 |
| hyperion-3 | 10 → 8 | 6 → 7 |
| hyperion-elite-5 | 9 → 7 | 6 → 4 |
| hyperion-max-3 | 10 → 8 | 6 → 7 |

### BROOKS (Case A)
| 신발 | stability |
|------|-----------|
| adrenaline-gts-25 | 9 → 8 |

### HOKA (Case B)
| 신발 | stability | durability |
|------|-----------|------------|
| arahi-8 | 10 → 8 | 6 → 10 |
| bondi-9 | 10 → 7 | 6 → 8 |
| clifton-10 | 10 → 8 | 6 → 8 |
| mach-x-3 | 9 → 7 | 6 → 7 |
| rocket-x-3 | 5 → 6 | 6 → 7 |

### HOKA (Case A)
| 신발 | stability |
|------|-----------|
| cielo-x1-3-0 | 7 → 6 |

### MIZUNO (Case B)
| 신발 | stability | durability |
|------|-----------|------------|
| neo-vista-2 | 4 → 5 | 6 → 9 |
| neo-zen | 6 → 4 | 6 → 7 |
| wave-rebellion-flash-3 | 10 → 7 | 6 → 5 |
| wave-rebellion-pro-3 | 5 → 6 | 6 → 5 |
| wave-rider-29 | — | 6 → 7 |
| wave-sky-9 | — | 9 → 5 |

### MIZUNO (Case A)
| 신발 | cushioning | stability |
|------|-----------|-----------|
| hyperwarp-elite | — | — |
| hyperwarp-pro | — | 7 → 6 |
| hyperwarp-pure | 7 → 8 | 7 → 6 |

### NEW BALANCE (Case B)
| 신발 | durability |
|------|-----------|
| fuelcell-propel-v5 | 6 → 7 |

### NEW BALANCE (Case A)
| 신발 | cushioning | stability |
|------|-----------|-----------|
| fresh-foam-x-more-v6 | 8 → 9 | — |
| fuelcell-sc-elite-v5 | 7 → 8 | 7 → 6 |

### NIKE (Case B)
| 신발 | stability | durability |
|------|-----------|------------|
| alphafly-3 | 7 → 5 | 4 → 3 |
| pegasus-41 | 9 → 6 | 8 → 7 |
| pegasus-plus | 10 → 7 | 7 → 6 |
| streakfly-2 | 2 → 3 | 3 → 5 |
| structure-26 | 10 → 7 | 8 → 9 |
| vaporfly-4 | 8 → 6 | 3 → 2 |
| vomero-18 | 10 → 7 | 10 → 7 |
| vomero-plus | 10 → 7 | 7 → 8 |
| vomero-premium | 6 → 9 | — |
| zoom-fly-6 | 10 → 9 | — |

### PUMA (Case B)
| 신발 | stability | durability |
|------|-----------|------------|
| deviate-nitro-3 | 5 → 6 | — |
| deviate-nitro-elite-3 | 8 → 6 | — |
| fast-r-nitro-elite-3 | 5 → 6 | — |
| foreverrun-nitro-2 | 9 → 4 | — |
| velocity-nitro-4 | — | 10 → 7 |

### SAUCONY (Case B)
| 신발 | stability | durability |
|------|-----------|------------|
| endorphin-elite-2 | 4 → 5 | — |
| endorphin-pro-4 | 4 → 5 | 6 → 7 |
| endorphin-speed-5 | 10 → 8 | — |
| endorphin-trainer | 9 → 7 | 6 → 8 |
| guide-18 | 9 → 6 | 6 → 9 |
| hurricane-25 | 10 → 8 | 6 → 8 |
| kinvara-16 | — | 6 → 5 |
| tempus-2 | — | 6 → 10 |
| triumph-23 | 10 → 8 | 6 → 8 |

---

## valueScore 연동 변경 (21개)

안정성/내구성 변경으로 인해 가성비(valueScore) 자동 재계산됨.

| 신발 | vs_old | vs_new | 방향 |
|------|--------|--------|------|
| adizero-adios-9 | 5 | 6 | ↑ |
| adizero-takumi-sen-11 | 6 | 5 | ↓ |
| superblast-2 | 7 | 6 | ↓ |
| glycerin-22 | 6 | 7 | ↑ |
| hyperion-elite-5 | 5 | 4 | ↓ |
| rocket-x-3 | 4 | 5 | ↑ |
| wave-rider-29 | 7 | 8 | ↑ |
| wave-sky-9 | 8 | 7 | ↓ |
| neo-vista-2 | 6 | 7 | ↑ |
| wave-rebellion-flash-3 | 8 | 7 | ↓ |
| hyperwarp-pro | 6 | 5 | ↓ |
| pegasus-41 | 8 | 7 | ↓ |
| vomero-18 | 9 | 7 | ↓↓ |
| vomero-premium | 5 | 6 | ↑ |
| pegasus-plus | 6 | 5 | ↓ |
| streakfly-2 | 4 | 5 | ↑ |
| alphafly-3 | 4 | 3 | ↓ |
| velocity-nitro-4 | 8 | 7 | ↓ |
| foreverrun-nitro-2 | 7 | 6 | ↓ |
| tempus-2 | 7 | 8 | ↑ |
| endorphin-pro-4 | 4 | 5 | ↑ |

---

## Case C 미처리 신발 (수동 검토 필요)

RunRepeat + RTINGS 둘 다 없어 자동 정규화 미적용. `normalize_from_reviews.py --apply` 별도 실행 후 proposedScores 검토 필요.

현재 DB 내 신발 86개 중 Case B(61) + Case A(15) = 76개 → **나머지 10개가 Case C 대상**.

---

## 수정 파일 목록

`data/brands/` 아래 9개 브랜드 파일 모두 수정됨:
- adidas.json, asics.json, brooks.json, hoka.json, mizuno.json
- new-balance.json, nike.json, puma.json, saucony.json
