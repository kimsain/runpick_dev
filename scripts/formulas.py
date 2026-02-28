"""
formulas.py — 스코어링 공식 단일 소스 (Single Source of Truth)

모든 정규화·파생 점수 공식을 순수 함수로 정의.
I/O 없음. 다른 스크립트에서 import하여 사용.
"""

import math
import re

# ─── 상수 ───────────────────────────────────────────────────────────

LIGHT_G = 129          # 최경량 기준 (g) — metaspeed-ray
HEAVY_G = 351          # 최중량 기준 (g) — vomero-premium

# 가성비 앵커 (경량성 weightScore와 동일 설계: 고정 min/max 기준)
# 앵커 업데이트 조건: 새 신발이 기존 앵커보다 극단값(더 낮거나 높은 ratio)을 가질 때만 변경
VALUE_RATIO_MIN = 22 / 599_000  # 최악 가성비: adizero-pro-evo-2 (sum=22, price=599,000)
VALUE_RATIO_MAX = 26.18 / 169_000  # 최고 가성비: novablast-5 (sum=26.18, price=169,000) — 2026-02-25 업데이트

# 쿠션성 앵커 (고정 — ratchet rule: 새 신발이 범위 벗어날 때만 확장)
# 2026-02-23 멀티에이전트 토론 합의 (CUSHIONING_DEBATE_2026-02-23.md)
CUSH_MIN_SA = 88       # RunRepeat SA 하한 — adizero-adios-9 (88.4) 기준
CUSH_MAX_SA = 150      # RunRepeat SA 상한 — max-cushion 실용 상한 (p95=149.8 근거)

RTINGS_CUSH_MIN = 4.5  # RTINGS 쿠션 하한 (고정, ratchet)
RTINGS_CUSH_MAX = 9.6  # RTINGS 쿠션 상한 (고정, ratchet)

# 반응성 앵커 (고정 — ratchet rule: 새 신발이 범위 벗어날 때만 확장)
# 2026-02-23 멀티에이전트 토론 합의 v3 (RESPONSIVENESS_DEBATE_2026-02-23.md)
# RESP_LO=46: 1점 경계 ~51.1% — ghost-max-3(50.8%)·gel-nimbus-28(45.2%) 최하위군
# RESP_HI=80: 정수 상한 기준 (46+34=80) — avg ER% ≥78.3% → 10점
# SCORE_VERSION = "2026-02-23-responsiveness-v3"
RESP_LO = 46           # ER% 하한 (고정 앵커, ratchet) — 51.1% 이하 = 1점
RESP_RANGE_INT = 34    # 정수용 (80-46) — avg ER% ≥78.3% → 10점
RESP_RANGE_RAW = 45    # raw 정밀용 (85-40)

DUR_LOG_BASE = 8.2     # 내구성 로그 밑

# 내구성 블렌딩 가중치 (2026-02-25 Codex+Gemini 합의)
# 아웃솔 70% + toeboxDurability 20% + heelPaddingDurability 10%
DUR_OUTSOLE_WEIGHT   = 0.70
DUR_TOEBOX_WEIGHT    = 0.20
DUR_HEEL_PAD_WEIGHT  = 0.10

# 안정성 Sway 패널티 앵커 (2026-02-23 Codex+Gemini 합의)
# ratchet rule: 새 신발이 범위 벗어날 때만 변경
# SCORE_VERSION = "2026-02-23-stability-v3"
STAB_TR_MIN = 2    # torsionalRigidity 실측 최솟값 (ratchet rule)
STAB_TR_MAX = 5    # torsionalRigidity 실측 최댓값
STAB_HCS_MIN = 1   # heelCounterStiffness 실측 최솟값
STAB_HCS_MAX = 5   # heelCounterStiffness 실측 최댓값
STAB_SA_LO = 130        # heel SA 임계값 — 이상 시 소프트니스 패널티 시작
STAB_SA_FO_LO = 125     # forefoot SA 임계값
STAB_STACK_LO = 40      # heel stack(mm) 임계값
STAB_STACK_FO_LO = 30   # forefoot stack(mm) 임계값
STAB_ER_PIVOT = 60      # ER% 오프셋 피벗 — 이상이면 sway 패널티 상쇄

# 안정성 midsoleWidth 앵커 (2026-02-25 Codex+Gemini 합의, ratchet rule)
# 86개 신발 실측 기준 — 새 신발이 범위 벗어날 때만 확장
STAB_MW_HEEL_LO  = 71    # heel midsoleWidth 최솟값 mm (streakfly-2 기준)
STAB_MW_HEEL_HI  = 105   # heel midsoleWidth 최댓값 mm (guide-18 기준)
STAB_MW_FORE_LO  = 101   # forefoot midsoleWidth 최솟값 mm (metaspeed-ray 기준)
STAB_MW_FORE_HI  = 124   # forefoot midsoleWidth 최댓값 mm (hurricane-25 기준)
STAB_SWAY_SCALE  = 0.5   # width 데이터 있을 때 sway 패널티 축소 계수
# SCORE_VERSION = "2026-02-25-durability-stability-v2"


# RTINGS 반응성 카테고리 페널티 (2026-02-23 재보정 — RESPONSIVENESS_DEBATE_2026-02-23.md)
# RESP_LO=40 기준 RunRepeat vs RTINGS 61개 신발 비교 후 subcategory별 avg bias 재계산
# 참고: max-cushion/stability 극단치(gel-nimbus-28, gel-kayano-32)는 측정방법론 차이로
#       MaxAE ≤1.5 달성 불가 — RTINGS가 두꺼운 폼의 재료 탄성을 과대평가하는 구조적 한계
RESP_PENALTY_BY_SUBCAT: dict = {
    "stability":   -3,   # avg bias +2.29 (n=7) → -3으로 avg ~1.3으로 감소
    "max-cushion": -3,   # avg bias +1.56 (n=9) → -3으로 avg ~0.56으로 감소
    "all-rounder": -2,   # avg bias +2.2 (n=5) → -2로 avg ~1.2으로 감소
    "entry":       -2,   # avg bias +2.0 (n=1) → -2로 avg ~1.0으로 감소
    "lightweight": -1,   # avg bias +2.0 but adizero-adios-9 underpredicts (-1) → 유지
    "no-plate":    -1,   # avg bias +0.8 (n=5) → 유지
    "light-plate": -2,   # avg bias +1.5 (n=8) → -2로 avg ~0.5으로 감소
}

# ─── 정규식 ─────────────────────────────────────────────────────────

STABILITY_POS_RE = re.compile(r"\b(?:stable|supportive)\b", re.IGNORECASE)
STABILITY_NEG_RE = re.compile(
    r"\b(?:unstable|wobbly|sloppy|less[-\s]+stable"
    r"|not(?:\s+\w+){0,2}\s+stable|lack(?:s|ing)?\s+stability)\b",
    re.IGNORECASE,
)
DURABILITY_POS_RE = re.compile(
    r"\b(?:durable|long[- ]lasting|holds?\s+up|durable\s+outsole"
    r"|(?:better|improved|excellent)\s+outsole\s+durability)\b",
    re.IGNORECASE,
)
DURABILITY_NEG_RE = re.compile(
    r"\b(wears fast|breaks down|poor durability|worn out)\b",
    re.IGNORECASE,
)

# ─── 유틸 ───────────────────────────────────────────────────────────


def clamp(val, lo, hi):
    return max(lo, min(hi, val))


def keyword_delta(text, pos_re, neg_re):
    """Return +1 if positive keywords found, -1 if negative, 0 otherwise."""
    has_pos = bool(pos_re.search(text))
    has_neg = bool(neg_re.search(text))
    if has_pos and not has_neg:
        return 1
    elif has_neg and not has_pos:
        return -1
    return 0


# ─── 파생 점수 (brands JSON만 필요) ─────────────────────────────────


def weight_score(weight_g):
    """경량성 점수 (1-10, 가벼울수록 높음). 런리핏 기준 평균 264g → 5점."""
    return clamp(round(1 + 9 * (HEAVY_G - weight_g) / (HEAVY_G - LIGHT_G)), 1, 10)


def raw_lightness(weight_g):
    """경량성 raw 점수 (≥1, 상한 없음). 정렬 전용."""
    return round(max(1.0, 1 + 9 * (HEAVY_G - weight_g) / (HEAVY_G - LIGHT_G)), 2)


def value_score(cush, resp, stab, dur, price):
    """가성비 점수 (1-10, 가성비 높을수록 높음).

    min/max 고정 앵커 선형 정규화:
      VALUE_RATIO_MIN = adizero-pro-evo-2 → 1점
      VALUE_RATIO_MAX = novablast-5 → 10점
    """
    if price <= 0:
        return 1
    ratio = (cush + resp + stab + dur) / price
    return clamp(
        round((ratio - VALUE_RATIO_MIN) / (VALUE_RATIO_MAX - VALUE_RATIO_MIN) * 9 + 1),
        1, 10
    )


# ─── Case B: RunRepeat 기반 정수 점수 ────────────────────────────────


def cushioning_from_runrepeat(heel_sa, forefoot_sa):
    """RunRepeat SA → 쿠션 정수 점수 (1-10).

    40/60 heel/forefoot, 고정 앵커 min-max 정규화.
    """
    raw = heel_sa * 0.4 + forefoot_sa * 0.6
    return clamp(round(1 + 9 * (raw - CUSH_MIN_SA) / (CUSH_MAX_SA - CUSH_MIN_SA)), 1, 10)


def responsiveness_from_runrepeat(heel_er, forefoot_er):
    """RunRepeat ER% → 반응성 정수 점수 (1-10).

    40/60 heel/forefoot (쿠션성과 통일), 고정 앵커 min-max 정규화.
    """
    avg_er = heel_er * 0.4 + forefoot_er * 0.6
    return clamp(round((avg_er - RESP_LO) / RESP_RANGE_INT * 10), 1, 10)


def stability_from_runrepeat(
    torsional_rigidity, heel_counter_stiffness,
    heel_sa=None, fore_sa=None,
    heel_er=None, fore_er=None,
    stack_heel=None, stack_fore=None,
    subcategory=None,
    midsole_width_heel=None, midsole_width_fore=None,
):
    """RunRepeat 안정성 → 정수 점수 (1-10).

    midsoleWidth 있으면: TR 35%/HCS 50%/Width 15%, sway 패널티 STAB_SWAY_SCALE 배.
    없으면: 기존 TR 40%/HCS 60%, sway 패널티 전체 적용 (하위 호환).
    subcategoryId="stability" 신발에 +1 보너스.
    """
    tr_norm  = 1 + 9 * (torsional_rigidity      - STAB_TR_MIN)  / (STAB_TR_MAX  - STAB_TR_MIN)
    hcs_norm = 1 + 9 * (heel_counter_stiffness  - STAB_HCS_MIN) / (STAB_HCS_MAX - STAB_HCS_MIN)

    if midsole_width_heel is not None:
        mw_h = 1 + 9 * (midsole_width_heel - STAB_MW_HEEL_LO) / (STAB_MW_HEEL_HI - STAB_MW_HEEL_LO)
        mw_f = (1 + 9 * (midsole_width_fore - STAB_MW_FORE_LO) / (STAB_MW_FORE_HI - STAB_MW_FORE_LO)
                if midsole_width_fore is not None else mw_h)
        mw_norm = clamp(0.4 * mw_h + 0.6 * mw_f, 1, 10)
        base = 0.35 * tr_norm + 0.50 * hcs_norm + 0.15 * mw_norm
        sway_scale = STAB_SWAY_SCALE
    else:
        base = 0.4 * tr_norm + 0.6 * hcs_norm
        sway_scale = 1.0

    if heel_sa is not None and stack_heel is not None:
        soft_h = max(0, (heel_sa - STAB_SA_LO) / 20)
        soft_f = max(0, (fore_sa - STAB_SA_FO_LO) / 20) if fore_sa is not None else soft_h
        soft = min(1.5, 0.7 * soft_h + 0.3 * soft_f)
        stk_h = max(0, (stack_heel - STAB_STACK_LO) / 15)
        stk_f = max(0, (stack_fore - STAB_STACK_FO_LO) / 10) if stack_fore is not None else stk_h
        stk = min(1.5, 0.7 * stk_h + 0.3 * stk_f)
        sway = 0.9 * soft + 0.8 * stk + 1.2 * (soft * stk)
        if heel_er is not None:
            avg_er = heel_er * 0.4 + fore_er * 0.6 if fore_er is not None else heel_er
            er_offset = max(0, (avg_er - STAB_ER_PIVOT) / 20)
            sway = max(0, sway - er_offset)
        base -= sway * sway_scale

    if subcategory == "stability":
        base += 1

    return clamp(round(base), 1, 10)


def durability_from_runrepeat(thickness_mm, abrasion_mm, toebox_dur=None, heel_pad_dur=None):
    """RunRepeat 두께+마모 → 내구성 정수 점수 (1-10).

    toebox_dur, heel_pad_dur (1-5 rating) 있으면 70/20/10 블렌딩.
    없으면 기존 아웃솔 단독 공식 유지 (하위 호환).
    """
    ratio = thickness_mm / abrasion_mm
    outsole_raw = math.log(ratio + 1) / math.log(DUR_LOG_BASE) * 9 + 1
    if toebox_dur is not None and heel_pad_dur is not None:
        tb_norm = 1 + 9 * (toebox_dur - 1) / 4    # 1-5 → 1-10
        hp_norm = 1 + 9 * (heel_pad_dur - 1) / 4
        outsole_raw = DUR_OUTSOLE_WEIGHT * outsole_raw + DUR_TOEBOX_WEIGHT * tb_norm + DUR_HEEL_PAD_WEIGHT * hp_norm
    return clamp(round(outsole_raw), 1, 10)


def durability_from_abrasion_only(abrasion_mm):
    """RunRepeat 마모만 → 내구성 정수 점수 (1-10)."""
    capped = min(abrasion_mm, 10.0)
    return clamp(round((10.0 - capped) / 10.0 * 9 + 1), 1, 10)


# ─── Case A: RTINGS 기반 정수 점수 ───────────────────────────────────


def cushioning_from_rtings(heel, forefoot):
    """RTINGS 쿠션 점수 → 정수 점수 (1-10).

    40/60 heel/forefoot (RunRepeat와 통일), 고정 앵커 min-max 정규화.
    """
    avg = heel * 0.4 + forefoot * 0.6
    return clamp(round(1 + 9 * (avg - RTINGS_CUSH_MIN) / (RTINGS_CUSH_MAX - RTINGS_CUSH_MIN)), 1, 10)


def responsiveness_from_rtings(heel_er, forefoot_er, subcategory_id):
    """RTINGS ER% → 반응성 정수 점수 (1-10, 카테고리 페널티 적용)."""
    avg_er = (heel_er + forefoot_er) / 2
    resp = clamp(round(avg_er / 10), 1, 10)
    penalty = RESP_PENALTY_BY_SUBCAT.get(subcategory_id, 0)
    if penalty != 0:
        resp = clamp(resp + penalty, 1, 10)
    return resp


# ─── Raw 정밀 점수 ──────────────────────────────────────────────────


def raw_cushioning_from_runrepeat(heel_sa, forefoot_sa):
    """RunRepeat SA → rawCushioning (1-10, 소수점 2자리)."""
    raw = heel_sa * 0.4 + forefoot_sa * 0.6
    return round(max(1.0, 1 + 9 * (raw - CUSH_MIN_SA) / (CUSH_MAX_SA - CUSH_MIN_SA)), 2)


def raw_cushioning_from_rtings(heel, forefoot):
    """RTINGS → rawCushioning (1-10, 소수점 2자리). 정수 함수와 동일 정규화."""
    avg = heel * 0.4 + forefoot * 0.6
    return round(max(1.0, 1 + 9 * (avg - RTINGS_CUSH_MIN) / (RTINGS_CUSH_MAX - RTINGS_CUSH_MIN)), 2)


def raw_responsiveness_from_runrepeat(heel_er, forefoot_er):
    """RunRepeat ER% → rawResponsiveness. 카드 공식(RESP_RANGE_INT) - round."""
    avg_er = heel_er * 0.4 + forefoot_er * 0.6
    return round(max(1.0, (avg_er - RESP_LO) / RESP_RANGE_INT * 10), 2)


def raw_responsiveness_from_rtings(heel_er, forefoot_er, subcategory_id=""):
    """RTINGS ER% → rawResponsiveness. 카드 공식(responsiveness_from_rtings) - round."""
    avg_er = (heel_er + forefoot_er) / 2
    resp = avg_er / 10   # 상한 제거 (페널티는 전부 음수라 충돌 없음)
    penalty = RESP_PENALTY_BY_SUBCAT.get(subcategory_id, 0)
    return round(max(1.0, resp + penalty), 2)


# ─── Raw 정밀 점수 (stability / durability / value) ──────────────────


def raw_stability_from_runrepeat(
    tr, hcs,
    heel_sa=None, fore_sa=None,
    heel_er=None, fore_er=None,
    stack_heel=None, stack_fore=None,
    subcategory=None,
    midsole_width_heel=None, midsole_width_fore=None,
):
    """stability_from_runrepeat과 동일 로직, round 없이 float 반환 (소수점 2자리)."""
    tr_norm  = 1 + 9 * (tr  - STAB_TR_MIN)  / (STAB_TR_MAX  - STAB_TR_MIN)
    hcs_norm = 1 + 9 * (hcs - STAB_HCS_MIN) / (STAB_HCS_MAX - STAB_HCS_MIN)

    if midsole_width_heel is not None:
        mw_h = 1 + 9 * (midsole_width_heel - STAB_MW_HEEL_LO) / (STAB_MW_HEEL_HI - STAB_MW_HEEL_LO)
        mw_f = (1 + 9 * (midsole_width_fore - STAB_MW_FORE_LO) / (STAB_MW_FORE_HI - STAB_MW_FORE_LO)
                if midsole_width_fore is not None else mw_h)
        mw_norm = clamp(0.4 * mw_h + 0.6 * mw_f, 1, 10)
        base = 0.35 * tr_norm + 0.50 * hcs_norm + 0.15 * mw_norm
        sway_scale = STAB_SWAY_SCALE
    else:
        base = 0.4 * tr_norm + 0.6 * hcs_norm
        sway_scale = 1.0

    if heel_sa is not None and stack_heel is not None:
        soft_h = max(0, (heel_sa - STAB_SA_LO) / 20)
        soft_f = max(0, (fore_sa - STAB_SA_FO_LO) / 20) if fore_sa is not None else soft_h
        soft = min(1.5, 0.7 * soft_h + 0.3 * soft_f)
        stk_h = max(0, (stack_heel - STAB_STACK_LO) / 15)
        stk_f = max(0, (stack_fore - STAB_STACK_FO_LO) / 10) if stack_fore is not None else stk_h
        stk = min(1.5, 0.7 * stk_h + 0.3 * stk_f)
        sway = 0.9 * soft + 0.8 * stk + 1.2 * (soft * stk)
        if heel_er is not None:
            avg_er = heel_er * 0.4 + fore_er * 0.6 if fore_er is not None else heel_er
            er_offset = max(0, (avg_er - STAB_ER_PIVOT) / 20)
            sway = max(0, sway - er_offset)
        base -= sway * sway_scale

    if subcategory == "stability":
        base += 1
    return round(max(1.0, base), 2)


def raw_durability_from_runrepeat(thickness_mm, abrasion_mm, toebox_dur=None, heel_pad_dur=None):
    """durability_from_runrepeat과 동일 로직, round 없이 float 반환."""
    ratio = thickness_mm / abrasion_mm
    outsole_raw = math.log(ratio + 1) / math.log(DUR_LOG_BASE) * 9 + 1
    if toebox_dur is not None and heel_pad_dur is not None:
        tb_norm = 1 + 9 * (toebox_dur - 1) / 4
        hp_norm = 1 + 9 * (heel_pad_dur - 1) / 4
        outsole_raw = DUR_OUTSOLE_WEIGHT * outsole_raw + DUR_TOEBOX_WEIGHT * tb_norm + DUR_HEEL_PAD_WEIGHT * hp_norm
    return round(max(1.0, outsole_raw), 2)


def raw_durability_from_abrasion_only(abrasion_mm):
    """durability_from_abrasion_only과 동일 로직, round 없이 float 반환."""
    capped = min(abrasion_mm, 10.0)
    return round(clamp((10.0 - capped) / 10.0 * 9 + 1, 1, 10), 2)


def raw_value_score(raw_cush, raw_resp, raw_stab, raw_dur, price):
    """가성비 raw 점수 (≥1 소수점, 상한 없음). 입력은 혼합 raw(float) 값. 정렬 전용."""
    if price <= 0:
        return 1.0
    ratio = (raw_cush + raw_resp + raw_stab + raw_dur) / price
    return round(max(1.0, (ratio - VALUE_RATIO_MIN) / (VALUE_RATIO_MAX - VALUE_RATIO_MIN) * 9 + 1), 2)
