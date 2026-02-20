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
VALUE_RATIO_MIN = 24 / 599_000  # 최악 가성비: adizero-pro-evo-2 (sum=24, price=599,000)
VALUE_RATIO_MAX = 30 / 169_000  # 최고 가성비: novablast-5 (sum=30, price=169,000)

CUSH_OFFSET = 50       # SA 하한
CUSH_RANGE = 104       # SA 범위 (154-50) — 정수 정규화용
CUSH_RANGE_RAW = 150   # raw 정밀용 넓은 범위

RESP_LO = 30           # ER% 하한
RESP_RANGE_INT = 52    # 정수용 (82-30)
RESP_RANGE_RAW = 55    # raw 정밀용 (85-30)

DUR_LOG_BASE = 8.2     # 내구성 로그 밑

RTINGS_CUSH_FACTOR = 0.675  # RTINGS 쿠션 편향 보정 계수

# RTINGS 반응성 카테고리 페널티 (calibrate_rtings.py 결과 기반)
RESP_PENALTY_BY_SUBCAT: dict = {
    "stability":   -2,   # avg bias +1.86
    "max-cushion": -2,   # avg bias +1.1 (with -1) → 총 -2
    "all-rounder": -1,   # avg bias +1.8
    "entry":       -1,   # avg bias +2
    "lightweight": -1,   # avg bias +1
    "no-plate":    -1,   # avg bias +0.7~1
    "light-plate": -1,   # avg bias +0.4~1
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
    """경량성 점수 (1-10, 가벼울수록 높음)."""
    return clamp(round((HEAVY_G - weight_g) / (HEAVY_G - LIGHT_G) * 10), 1, 10)


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
    """RunRepeat SA → 쿠션 정수 점수 (1-10)."""
    raw = heel_sa * 0.4 + forefoot_sa * 0.6
    return clamp(round((raw - CUSH_OFFSET) / CUSH_RANGE * 10), 1, 10)


def responsiveness_from_runrepeat(heel_er, forefoot_er):
    """RunRepeat ER% → 반응성 정수 점수 (1-10)."""
    avg_er = (heel_er + forefoot_er) / 2
    return clamp(round((avg_er - RESP_LO) / RESP_RANGE_INT * 10), 1, 10)


def stability_from_runrepeat(torsional_rigidity, heel_counter_stiffness):
    """RunRepeat 안정성 → 정수 점수 (1-10)."""
    return clamp(round(torsional_rigidity + heel_counter_stiffness), 1, 10)


def durability_from_runrepeat(thickness_mm, abrasion_mm):
    """RunRepeat 두께+마모 → 내구성 정수 점수 (1-10)."""
    ratio = thickness_mm / abrasion_mm
    return clamp(round(math.log(ratio + 1) / math.log(DUR_LOG_BASE) * 9 + 1), 1, 10)


def durability_from_abrasion_only(abrasion_mm):
    """RunRepeat 마모만 → 내구성 정수 점수 (1-10)."""
    capped = min(abrasion_mm, 10.0)
    return clamp(round((10.0 - capped) / 10.0 * 9 + 1), 1, 10)


# ─── Case A: RTINGS 기반 정수 점수 ───────────────────────────────────


def cushioning_from_rtings(heel, forefoot):
    """RTINGS 쿠션 점수 → 정수 점수 (단순 평균)."""
    return round((heel + forefoot) / 2)


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
    """RunRepeat SA → rawCushioning (0-10, 소수점 2자리)."""
    return round(clamp((heel_sa * 0.4 + forefoot_sa * 0.6 - CUSH_OFFSET) / CUSH_RANGE_RAW * 10, 0, 10), 2)


def raw_cushioning_from_rtings(heel, forefoot):
    """RTINGS → rawCushioning (0-10, 소수점 2자리, 편향 보정)."""
    return round(clamp(RTINGS_CUSH_FACTOR * (heel + forefoot) / 2, 0, 10), 2)


def raw_responsiveness_from_runrepeat(heel_er, forefoot_er):
    """RunRepeat ER% → rawResponsiveness (0-10, 소수점 2자리)."""
    return round(clamp(((heel_er + forefoot_er) / 2 - RESP_LO) / RESP_RANGE_RAW * 10, 0, 10), 2)


def raw_responsiveness_from_rtings(heel_er, forefoot_er):
    """RTINGS ER% → rawResponsiveness (0-10, 소수점 2자리)."""
    return round(clamp((heel_er + forefoot_er) / 2 / 10, 0, 10), 2)
