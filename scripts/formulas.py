"""
formulas.py — 스코어링 공식 단일 소스 (Single Source of Truth)

모든 정규화·파생 점수 공식을 순수 함수로 정의.
I/O 없음. 다른 스크립트에서 import하여 사용.
"""

import math
import re

SCORE_VERSION = "durability-stability-v3"

# ─── 상수 ───────────────────────────────────────────────────────────

LIGHT_G = 129          # 최경량 기준 (g) — metaspeed-ray
HEAVY_G = 351          # 최중량 기준 (g) — vomero-premium

# 가성비 앵커 (경량성 weightScore와 동일 설계: 고정 min/max 기준)
# 앵커 업데이트 조건: 새 신발이 기존 앵커보다 극단값(더 낮거나 높은 ratio)을 가질 때만 변경
VALUE_RATIO_MIN = 22 / 599_000  # 최악 가성비: adizero-pro-evo-2 (sum=22, price=599,000)
VALUE_RATIO_MAX = 0.0001687417  # 동적 보정 (top-5 경계, --calibrate 자동 갱신)

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

# 내구성 보정 앵커 (ratchet rule + --calibrate 갱신)
# intermediate rawDurability를 1-10 스케일로 rescale
# 초기값: identity (변환 없음). 첫 --calibrate 실행 시 실제 값으로 갱신.
DUR_RAW_MIN = 3.6574798136  # bottom-5 경계 (--calibrate 자동 갱신)
DUR_RAW_MAX = 9.3334864638  # top-5 경계 (--calibrate 자동 갱신)

# 안정성 Sway 패널티 앵커 (2026-02-23 Codex+Gemini 합의)
# ratchet rule: 새 신발이 범위 벗어날 때만 변경
# SCORE_VERSION = "2026-02-23-stability-v3"
STAB_TR_MIN = 2    # torsionalRigidity 실측 최솟값 (ratchet rule)
STAB_TR_MAX = 5    # torsionalRigidity 실측 최댓값
STAB_HCS_MIN = 1   # heelCounterStiffness 실측 최솟값
STAB_HCS_MAX = 5   # heelCounterStiffness 실측 최댓값
# 스택 높이 cubic 패널티 앵커 (2026-03-01 유저+Codex+Gemini 합의)
# 중립점 = 데이터 median. 저스택=안정 보너스, 고스택=가속 페널티 (x³)
STAB_STACK_HEEL_MID = 39   # heel 중립점 mm (median, penalty=0)
STAB_STACK_FORE_MID = 32   # forefoot 중립점 mm (median, penalty=0)
STAB_STACK_SCALE    = 10   # 정규화 스케일 (heel/fore 공통, 15→10 리밸런싱)

# 미드솔 소프트니스 앵커 (Asker C durometer, lower = softer)
# 2026-03-01 Codex+Gemini 합의: SA→AC 교체, ER% 보상 완전 제거
STAB_AC_HI    = 42    # AC ≥ 42: firm EVA, 소프트니스 패널티 없음
STAB_AC_SCALE = 15    # 정규화 (soft = max(0, (HI - ac) / SCALE))
STAB_AC_MEDIAN = 34.0 # AC 미가용 시 중앙값 대입 (63개 신발 median)

# 안정성 플랫폼 앵커 (V3 rollout 기준 p10 / p90 고정)
STAB_MW_HEEL_LO  = 76.70   # RunRepeat midsole heel width p10
STAB_MW_HEEL_HI  = 99.62   # RunRepeat midsole heel width p90
STAB_MW_FORE_LO  = 108.98  # RunRepeat midsole forefoot width p10
STAB_MW_FORE_HI  = 122.02  # RunRepeat midsole forefoot width p90

STAB_RT_OUTSOLE_HEEL_LO = 75.50   # RTINGS outsole heel width p10
STAB_RT_OUTSOLE_HEEL_HI = 98.50   # RTINGS outsole heel width p90
STAB_RT_OUTSOLE_FORE_LO = 106.50  # RTINGS outsole forefoot width p10
STAB_RT_OUTSOLE_FORE_HI = 119.50  # RTINGS outsole forefoot width p90

STAB_RT_RATIO_HEEL_LO = 1.90    # RTINGS heel width-to-stack ratio p10
STAB_RT_RATIO_HEEL_HI = 2.575   # RTINGS heel width-to-stack ratio p90
STAB_RT_RATIO_FORE_LO = 3.045   # RTINGS forefoot width-to-stack ratio p10
STAB_RT_RATIO_FORE_HI = 4.36    # RTINGS forefoot width-to-stack ratio p90

RTINGS_FIRM_HEEL_1100_LO = 87.85   # p10
RTINGS_FIRM_HEEL_1100_HI = 144.15  # p90
RTINGS_FIRM_FORE_1300_LO = 158.95  # p10
RTINGS_FIRM_FORE_1300_HI = 290.45  # p90

MIDSOLE_RETENTION_MIN = 0.90   # RTINGS long-run retention ratio 하한
MIDSOLE_RETENTION_MAX = 0.98   # RTINGS long-run retention ratio 상한
MIDSOLE_LONGRUN_CORE_ENABLED = False  # 최신 merged research 커버리지 52.2% → modifier-only
MIDSOLE_LONGRUN_MODIFIER_CAP = 1.00

# 안정성 보정 앵커 (ratchet rule + --calibrate 갱신)
# intermediate rawStability를 1-10 스케일로 rescale
# 초기값: identity (변환 없음). 첫 --calibrate 실행 시 실제 값으로 갱신.
STAB_RAW_MIN = 2.1891495971  # bottom-5 경계 (--calibrate 자동 갱신)
STAB_RAW_MAX = 9.3630044998  # top-5 경계 (--calibrate 자동 갱신)

STAB_KEYWORD_MODIFIER = 0.3  # 정성 리뷰 키워드 안정성 조정 계수

# Sway: tanh 기울기 (cubic → tanh 전환, 3-LLM 합의 2026-03-01)
STAB_TANH_GAIN = 1.5

# Subcategory 그룹별 Width imputation (실측 median, width 누락 시 사용)
SUBCAT_WIDTH = {
    'racing':    (77, 110),    # half+full (n=19)
    'speed':     (87, 114),    # light-plate+carbon-plate+lightweight (n=13)
    'daily':     (91, 115),    # all-rounder+entry+no-plate (n=18)
    'cushion':   (99, 119),    # max-cushion (n=12)
    'stability': (97, 119),    # stability (n=8)
}
SUBCAT_WIDTH_MAP = {
    'half': 'racing', 'full': 'racing',
    'light-plate': 'speed', 'carbon-plate': 'speed', 'lightweight': 'speed',
    'all-rounder': 'daily', 'entry': 'daily', 'no-plate': 'daily',
    'max-cushion': 'cushion',
    'stability': 'stability',
}

# Subcategory AC prior (실측 median, AC 누락 시 사용 — 기존 STAB_AC_MEDIAN=34.0 대체)
SUBCAT_AC_PRIOR = {
    'half': 30.4, 'full': 34.3,
    'light-plate': 37.5, 'carbon-plate': 31.8, 'lightweight': 36.2,
    'all-rounder': 36.2, 'entry': 35.2, 'no-plate': 32.0,
    'max-cushion': 32.5,
    'stability': 38.3,
}

# Subcategory 안정성 보너스/패널티 (3-LLM 합의 2026-03-01)
SUBCAT_STAB_DELTA = {
    'stability': 1.0,       # 구조적 안정화 장치 인정
    'half': -1.0,           # 레이싱 플랫 본질적 불안정
    'full': -0.5,           # 플레이트 레이싱 (플레이트가 일부 강성 보완)
    'max-cushion': -0.5,    # 고스택 쿠션 고유수용감각 저하
}


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

STABILITY_POS_RE = re.compile(
    r"\b(?:stable|supportive|locked[-\s]in|secure(?:\s+fit)?"
    r"|guide[-\s]rail|medial[-\s]post|wide[-\s](?:base|platform))\b",
    re.IGNORECASE,
)
STABILITY_NEG_RE = re.compile(
    r"\b(?:unstable|wobbly|sloppy|tippy|less[-\s]+stable"
    r"|not(?:\s+\w+){0,2}\s+stable|lack(?:s|ing)?\s+stability"
    r"|narrow[-\s](?:base|platform)|rolls?\s+(?:in|out)ward)\b",
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


def normalize_1_10(val, lo, hi):
    """선형 1-10 정규화. 경계 밖은 clamp."""
    if val is None:
        return None
    if hi <= lo:
        return 5.5
    return clamp(1 + 9 * (val - lo) / (hi - lo), 1, 10)


def weighted_mean_available(pairs):
    """[(value, weight)]에서 None 제외 후 가중평균."""
    valid = [(float(v), float(w)) for v, w in pairs if v is not None and w > 0]
    if not valid:
        return None
    total_weight = sum(w for _, w in valid)
    if total_weight <= 0:
        return None
    return sum(v * w for v, w in valid) / total_weight


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
      VALUE_RATIO_MAX = top-5 경계 (--calibrate 자동 갱신)
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


def _stab_intermediate(
    tr, hcs,
    heel_ac=None,
    secondary_foam_ac=None,
    stack_heel=None, stack_fore=None,
    subcategory=None,
    midsole_width_heel=None, midsole_width_fore=None,
    findings_text=None,
):
    """구조(TR/HCS/Width) + sway(tanh) + subcategory delta → intermediate 안정성.

    3-LLM 합의 (2026-03-01):
    - Base: TR 30% + HCS 30% + Width 40% (width는 subcategory median imputation)
    - Sway: tanh(1.5) 기반 stack penalty, 비대칭 bound [-0.5, 1.0]
    - AC: subcategory prior (일괄 median 34.0 폐지)
    - Subcategory delta: stability +1.0, half -1.0, full/max-cushion -0.5
    - 측정 확인 보너스: stability + TR≥4 → +0.5
    """
    tr_norm  = clamp(1 + 9 * (tr  - STAB_TR_MIN)  / (STAB_TR_MAX  - STAB_TR_MIN), 1, 10)
    hcs_norm = clamp(1 + 9 * (hcs - STAB_HCS_MIN) / (STAB_HCS_MAX - STAB_HCS_MIN), 1, 10)

    # Width: 항상 계산 (누락 시 subcategory median imputation)
    if midsole_width_heel is not None:
        mw_heel = midsole_width_heel
        mw_fore = midsole_width_fore if midsole_width_fore is not None else mw_heel
    else:
        grp = SUBCAT_WIDTH_MAP.get(subcategory, 'daily')
        mw_heel, mw_fore = SUBCAT_WIDTH[grp]

    mw_h = 1 + 9 * (mw_heel - STAB_MW_HEEL_LO) / (STAB_MW_HEEL_HI - STAB_MW_HEEL_LO)
    mw_f = 1 + 9 * (mw_fore - STAB_MW_FORE_LO) / (STAB_MW_FORE_HI - STAB_MW_FORE_LO)
    mw_norm = clamp(0.4 * mw_h + 0.6 * mw_f, 1, 10)

    # Base: TR 30% + HCS 30% + Width 40%
    base = 0.30 * tr_norm + 0.30 * hcs_norm + 0.40 * mw_norm

    # Sway (stack + softness): tanh 기반, 비대칭 bound
    if stack_heel is not None:
        # AC: max(primary, secondary) — 더 단단한 폼이 구조적 지지 제공
        # 누락 시 subcategory prior 사용
        ac_vals = [v for v in [heel_ac, secondary_foam_ac] if v is not None]
        ac = max(ac_vals) if ac_vals else SUBCAT_AC_PRIOR.get(subcategory, 34.0)
        soft = min(1.5, max(0, (STAB_AC_HI - ac) / STAB_AC_SCALE))

        # Stack: tanh(gain=1.5), midpoint = dataset median (39mm heel, 32mm fore)
        u_h = (stack_heel - STAB_STACK_HEEL_MID) / STAB_STACK_SCALE
        u_f = ((stack_fore - STAB_STACK_FORE_MID) / STAB_STACK_SCALE
               if stack_fore is not None else u_h)
        stk_h = math.tanh(STAB_TANH_GAIN * u_h)
        stk_f = math.tanh(STAB_TANH_GAIN * u_f)
        stk_raw = 0.7 * stk_h + 0.3 * stk_f

        # 비대칭 bound: 저스택 보너스 ≤ 50% of 고스택 패널티
        stk = max(-0.5, min(1.0, stk_raw))

        sway = 0.4 * soft + 1.0 * stk + 0.8 * (soft * stk)
        base -= sway

    # Subcategory delta
    base += SUBCAT_STAB_DELTA.get(subcategory, 0.0)

    # 측정 확인 보너스: stability 카테고리 + TR≥4 (실측 torsional rigidity 뒷받침)
    if subcategory == 'stability' and tr >= 4:
        base += 0.5

    if findings_text:
        kw_delta = keyword_delta(findings_text, STABILITY_POS_RE, STABILITY_NEG_RE)
        base += kw_delta * STAB_KEYWORD_MODIFIER

    return base


def stability_from_runrepeat(
    torsional_rigidity, heel_counter_stiffness,
    heel_ac=None, secondary_foam_ac=None,
    stack_heel=None, stack_fore=None,
    subcategory=None,
    midsole_width_heel=None, midsole_width_fore=None,
    findings_text=None,
):
    """RunRepeat 안정성 → 정수 점수 (1-10), STAB_RAW_MIN/MAX 보정 적용.

    3-LLM 합의 (2026-03-01): TR 30%/HCS 30%/Width 40%, tanh sway, subcat imputation+delta.
    """
    intermediate = _stab_intermediate(
        torsional_rigidity, heel_counter_stiffness,
        heel_ac, secondary_foam_ac,
        stack_heel, stack_fore, subcategory,
        midsole_width_heel, midsole_width_fore, findings_text,
    )
    rescaled = 1 + 9 * (intermediate - STAB_RAW_MIN) / (STAB_RAW_MAX - STAB_RAW_MIN)
    return clamp(round(rescaled), 1, 10)


def _dur_intermediate(thickness_mm, abrasion_mm, toebox_dur=None, heel_pad_dur=None):
    """Log-ratio + 블렌딩 → intermediate 내구성 (rescale 전)."""
    ratio = thickness_mm / abrasion_mm
    outsole_raw = math.log(ratio + 1) / math.log(DUR_LOG_BASE) * 9 + 1
    if toebox_dur is not None and heel_pad_dur is not None:
        tb_norm = 1 + 9 * (toebox_dur - 1) / 4
        hp_norm = 1 + 9 * (heel_pad_dur - 1) / 4
        outsole_raw = (DUR_OUTSOLE_WEIGHT * outsole_raw
                       + DUR_TOEBOX_WEIGHT * tb_norm
                       + DUR_HEEL_PAD_WEIGHT * hp_norm)
    return outsole_raw


def durability_from_runrepeat(thickness_mm, abrasion_mm, toebox_dur=None, heel_pad_dur=None):
    """RunRepeat 두께+마모 → 내구성 정수 점수 (1-10), DUR_RAW_MIN/MAX 보정 적용."""
    intermediate = _dur_intermediate(thickness_mm, abrasion_mm, toebox_dur, heel_pad_dur)
    rescaled = 1 + 9 * (intermediate - DUR_RAW_MIN) / (DUR_RAW_MAX - DUR_RAW_MIN)
    return clamp(round(rescaled), 1, 10)


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


# ─── V3: Stability / Durability components ────────────────────────────


def stability_structure_component(tr, hcs):
    """RunRepeat TR/HCS 구조 점수 (1-10 intermediate)."""
    tr_norm = normalize_1_10(tr, STAB_TR_MIN, STAB_TR_MAX)
    hcs_norm = normalize_1_10(hcs, STAB_HCS_MIN, STAB_HCS_MAX)
    if tr_norm is None or hcs_norm is None:
        return None
    return round(0.55 * tr_norm + 0.45 * hcs_norm, 2)


def stability_rr_platform_component(mw_heel, mw_fore):
    """RunRepeat midsole width 기반 플랫폼 점수."""
    heel_norm = normalize_1_10(mw_heel, STAB_MW_HEEL_LO, STAB_MW_HEEL_HI)
    fore_norm = normalize_1_10(mw_fore, STAB_MW_FORE_LO, STAB_MW_FORE_HI)
    if heel_norm is None or fore_norm is None:
        return None
    return round(0.4 * heel_norm + 0.6 * fore_norm, 2)


def stability_rtings_outsole_platform_component(width_heel, width_fore):
    """RTINGS outsole width 기반 플랫폼 점수."""
    heel_norm = normalize_1_10(width_heel, STAB_RT_OUTSOLE_HEEL_LO, STAB_RT_OUTSOLE_HEEL_HI)
    fore_norm = normalize_1_10(width_fore, STAB_RT_OUTSOLE_FORE_LO, STAB_RT_OUTSOLE_FORE_HI)
    if heel_norm is None or fore_norm is None:
        return None
    return round(0.4 * heel_norm + 0.6 * fore_norm, 2)


def stability_rtings_ratio_platform_component(ratio_heel, ratio_fore):
    """RTINGS width-to-stack ratio 기반 플랫폼 점수."""
    heel_norm = normalize_1_10(ratio_heel, STAB_RT_RATIO_HEEL_LO, STAB_RT_RATIO_HEEL_HI)
    fore_norm = normalize_1_10(ratio_fore, STAB_RT_RATIO_FORE_LO, STAB_RT_RATIO_FORE_HI)
    if heel_norm is None or fore_norm is None:
        return None
    return round(0.4 * heel_norm + 0.6 * fore_norm, 2)


def stability_platform_component(rr_platform=None, rt_outsole_platform=None, rt_ratio_platform=None):
    """가용 플랫폼 신호 결합: RR midsole 45%, RT outsole 35%, RT ratio 20%."""
    score = weighted_mean_available([
        (rr_platform, 0.45),
        (rt_outsole_platform, 0.35),
        (rt_ratio_platform, 0.20),
    ])
    return round(score, 2) if score is not None else None


def stability_softness_from_ac(heel_ac=None, secondary_foam_ac=None, subcategory=None):
    """RunRepeat AC 또는 subcategory prior → softness scalar(0~1.5)."""
    ac_vals = [v for v in [heel_ac, secondary_foam_ac] if v is not None]
    ac = max(ac_vals) if ac_vals else SUBCAT_AC_PRIOR.get(subcategory, STAB_AC_MEDIAN)
    soft = min(1.5, max(0.0, (STAB_AC_HI - ac) / STAB_AC_SCALE))
    return round(soft, 2), round(ac, 2)


def stability_softness_from_rtings_firmness(heel_firmness=None, fore_firmness=None):
    """RTINGS firmness를 softness scalar(0~1.5)로 변환."""
    heel_norm = normalize_1_10(heel_firmness, RTINGS_FIRM_HEEL_1100_LO, RTINGS_FIRM_HEEL_1100_HI)
    fore_norm = normalize_1_10(fore_firmness, RTINGS_FIRM_FORE_1300_LO, RTINGS_FIRM_FORE_1300_HI)
    firm_norm = weighted_mean_available([(heel_norm, 0.4), (fore_norm, 0.6)])
    if firm_norm is None:
        return None
    soft = 1.5 * (10 - firm_norm) / 9
    return round(clamp(soft, 0.0, 1.5), 2)


def stability_sway_penalty(stack_heel=None, stack_fore=None, softness_scalar=None):
    """tanh 기반 sway 패널티. negative 값은 저스택 보너스 역할."""
    if stack_heel is None or softness_scalar is None:
        return 0.0
    u_h = (stack_heel - STAB_STACK_HEEL_MID) / STAB_STACK_SCALE
    u_f = ((stack_fore - STAB_STACK_FORE_MID) / STAB_STACK_SCALE
           if stack_fore is not None else u_h)
    stk_h = math.tanh(STAB_TANH_GAIN * u_h)
    stk_f = math.tanh(STAB_TANH_GAIN * u_f)
    stk_raw = 0.7 * stk_h + 0.3 * stk_f
    stk = max(-0.5, min(1.0, stk_raw))
    sway = 0.4 * softness_scalar + 1.0 * stk + 0.8 * (softness_scalar * stk)
    return round(sway, 2)


def stability_qualitative_modifier(lockdown=0.0, guidance_sidewall=0.0, wide_base=0.0,
                                   heel_slip=0.0, instability=0.0):
    raw = (
        0.30 * lockdown
        + 0.35 * guidance_sidewall
        + 0.20 * wide_base
        - 0.45 * heel_slip
        - 0.60 * instability
    )
    return round(clamp(raw, -1.25, 1.25), 2)


def stability_intermediate_v3(structure_score=None, platform_score=None, subcategory=None,
                              sway_penalty=0.0, qual_modifier=0.0):
    core = weighted_mean_available([
        (structure_score, 0.55),
        (platform_score, 0.45),
    ])
    base = 5.5 if core is None else core
    raw = base + SUBCAT_STAB_DELTA.get(subcategory, 0.0) + qual_modifier
    if core is not None:
        raw -= sway_penalty
    return round(raw, 2)


def stability_from_intermediate_v3(intermediate):
    rescaled = 1 + 9 * (intermediate - STAB_RAW_MIN) / (STAB_RAW_MAX - STAB_RAW_MIN)
    return clamp(round(rescaled), 1, 10)


def raw_stability_from_intermediate_v3(intermediate):
    rescaled = 1 + 9 * (intermediate - STAB_RAW_MIN) / (STAB_RAW_MAX - STAB_RAW_MIN)
    return round(max(1.0, rescaled), 2)


def durability_outsole_component(thickness_mm, abrasion_mm):
    """Outsole thickness/abrasion log 점수 (1-10 intermediate)."""
    ratio = thickness_mm / abrasion_mm
    return round(math.log(ratio + 1) / math.log(DUR_LOG_BASE) * 9 + 1, 2)


def durability_outsole_from_abrasion_only(abrasion_mm):
    capped = min(abrasion_mm, 10.0)
    return round(clamp((10.0 - capped) / 10.0 * 9 + 1, 1, 10), 2)


def durability_upper_component(toebox_dur=None, heel_pad_dur=None):
    """Upper wear 점수: toebox 60%, heel padding 40%."""
    tb_norm = normalize_1_10(toebox_dur, 1, 5)
    hp_norm = normalize_1_10(heel_pad_dur, 1, 5)
    score = weighted_mean_available([
        (tb_norm, 0.60),
        (hp_norm, 0.40),
    ])
    return round(score, 2) if score is not None else None


def durability_midsole_longevity_component(retention_ratio):
    """RTINGS long-run retention ratio → midsole longevity 점수."""
    score = normalize_1_10(retention_ratio, MIDSOLE_RETENTION_MIN, MIDSOLE_RETENTION_MAX)
    return round(score, 2) if score is not None else None


def durability_midsole_longevity_modifier(retention_ratio):
    """Coverage<60 rollout: midsole longevity는 core 대신 bounded raw modifier로 사용."""
    score = durability_midsole_longevity_component(retention_ratio)
    if score is None:
        return 0.0
    raw = ((score - 5.5) / 4.5) * MIDSOLE_LONGRUN_MODIFIER_CAP
    return round(clamp(raw, -MIDSOLE_LONGRUN_MODIFIER_CAP, MIDSOLE_LONGRUN_MODIFIER_CAP), 2)


def durability_compound_modifier(outsole_hardness_hc=None):
    """Outsole hardness는 modifier만 담당."""
    if outsole_hardness_hc is None:
        return 0.0
    if outsole_hardness_hc < 78:
        raw = -0.5 * (78 - outsole_hardness_hc) / (78 - 55)
    else:
        raw = 0.5 * (outsole_hardness_hc - 78) / (88 - 78)
    return round(clamp(raw, -0.75, 0.75), 2)


def durability_qualitative_modifier(outsole_coverage=0.0, upper_reinforcement=0.0, durable=0.0,
                                    early_wear=0.0, exposed_foam=0.0, midsole_breakdown=0.0):
    raw = (
        0.30 * outsole_coverage
        + 0.25 * upper_reinforcement
        + 0.15 * durable
        - 0.45 * early_wear
        - 0.35 * exposed_foam
        - 0.35 * midsole_breakdown
    )
    return round(clamp(raw, -1.5, 1.5), 2)


def durability_intermediate_v3(outsole_score=None, upper_score=None, midsole_longevity_score=None,
                               midsole_longevity_modifier=0.0, compound_modifier=0.0, qual_modifier=0.0):
    core_inputs = [
        (outsole_score, 0.60),
        (upper_score, 0.20),
    ]
    if MIDSOLE_LONGRUN_CORE_ENABLED:
        core_inputs.append((midsole_longevity_score, 0.20))
    core = weighted_mean_available(core_inputs)
    if core is None:
        return round(5.5 + midsole_longevity_modifier + qual_modifier, 2)
    return round(core + midsole_longevity_modifier + compound_modifier + qual_modifier, 2)


def durability_from_intermediate_v3(intermediate):
    rescaled = 1 + 9 * (intermediate - DUR_RAW_MIN) / (DUR_RAW_MAX - DUR_RAW_MIN)
    return clamp(round(rescaled), 1, 10)


def raw_durability_from_intermediate_v3(intermediate):
    rescaled = 1 + 9 * (intermediate - DUR_RAW_MIN) / (DUR_RAW_MAX - DUR_RAW_MIN)
    return round(max(1.0, rescaled), 2)


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
    heel_ac=None, secondary_foam_ac=None,
    stack_heel=None, stack_fore=None,
    subcategory=None,
    midsole_width_heel=None, midsole_width_fore=None,
    findings_text=None,
):
    """stability_from_runrepeat과 동일 로직, round 없이 float 반환 (소수점 2자리)."""
    intermediate = _stab_intermediate(
        tr, hcs, heel_ac, secondary_foam_ac,
        stack_heel, stack_fore, subcategory,
        midsole_width_heel, midsole_width_fore, findings_text,
    )
    rescaled = 1 + 9 * (intermediate - STAB_RAW_MIN) / (STAB_RAW_MAX - STAB_RAW_MIN)
    return round(max(1.0, rescaled), 2)


def raw_durability_from_runrepeat(thickness_mm, abrasion_mm, toebox_dur=None, heel_pad_dur=None):
    """durability_from_runrepeat과 동일 로직, round 없이 float 반환."""
    intermediate = _dur_intermediate(thickness_mm, abrasion_mm, toebox_dur, heel_pad_dur)
    rescaled = 1 + 9 * (intermediate - DUR_RAW_MIN) / (DUR_RAW_MAX - DUR_RAW_MIN)
    return round(max(1.0, rescaled), 2)


def raw_durability_from_abrasion_only(abrasion_mm):
    """durability_from_abrasion_only과 동일 로직, round 없이 float 반환."""
    capped = min(abrasion_mm, 10.0)
    return round(clamp((10.0 - capped) / 10.0 * 9 + 1, 1, 10), 2)


def raw_value_score(raw_cush, raw_resp, raw_stab, raw_dur, price):
    """가성비 raw 점수 (≥1 소수점, 상한 없음). 서브스코어는 [1,10] 클램프 후 합산. 정렬 전용."""
    if price <= 0:
        return 1.0
    c = min(10.0, max(1.0, raw_cush))
    r = min(10.0, max(1.0, raw_resp))
    s = min(10.0, max(1.0, raw_stab))
    d = min(10.0, max(1.0, raw_dur))
    ratio = (c + r + s + d) / price
    return round(max(1.0, (ratio - VALUE_RATIO_MIN) / (VALUE_RATIO_MAX - VALUE_RATIO_MIN) * 9 + 1), 2)


def compute_value_ratio_max(shoes_data, top_n=5):
    """전체 신발의 value ratio를 계산하여 VALUE_RATIO_MAX를 반환.

    score = round((ratio - MIN) / (MAX - MIN) * 9 + 1) 공식 기준:
      - top_n번째 신발: score ≥ 9.5 → 10점
      - (top_n+1)번째 신발: score < 9.5 → 9점
    이 두 조건을 모두 만족하는 MAX 범위의 중간값을 반환.
    """
    ratios = []
    for shoe in shoes_data:
        specs = shoe.get("specs", {})
        price = shoe.get("price")
        cush = specs.get("cushioning")
        resp = specs.get("responsiveness")
        stab = specs.get("stability")
        dur = specs.get("durability")
        if price and price > 0 and all(v is not None for v in [cush, resp, stab, dur]):
            ratios.append((cush + resp + stab + dur) / price)
    ratios.sort(reverse=True)
    if len(ratios) <= top_n:
        return ratios[-1] if ratios else VALUE_RATIO_MAX
    lo = ratios[top_n]      # (top_n+1)번째: 9점이어야 → score < 9.5
    hi = ratios[top_n - 1]  # top_n번째: 10점이어야 → score ≥ 9.5
    # score < 9.5: MAX > MIN + (lo - MIN)*9/8.5  (= max_lower)
    # score ≥ 9.5: MAX ≤ MIN + (hi - MIN)*9/8.5  (= max_upper)
    max_lower = VALUE_RATIO_MIN + (lo - VALUE_RATIO_MIN) * 9 / 8.5
    max_upper = VALUE_RATIO_MIN + (hi - VALUE_RATIO_MIN) * 9 / 8.5
    if max_lower >= max_upper:
        # 동률 (두 ratio가 동일) → 기존 MAX 유지
        return VALUE_RATIO_MAX
    return (max_lower + max_upper) / 2


def compute_dur_anchors(shoes_data, top_n=5):
    """전체 신발의 rawDurability로 DUR_RAW_MIN/MAX 반환.

    score = round(1 + 9*(x - MIN)/(MAX - MIN)) 공식 기준:
      - bottom top_n: score 1 (rescaled < 1.5)
      - top top_n: score 10 (rescaled >= 9.5)
    rank-(top_n)과 rank-(top_n+1) 경계의 중간값 기반으로 MIN/MAX 계산.

    NOTE: 저장된 rawDurability가 이미 보정 스케일이면
    현재 DUR_RAW_MIN/MAX로 un-rescale해서 intermediate를 복원한 후 계산.
    """
    raws = []
    for shoe in shoes_data:
        rd = shoe.get("specs", {}).get("rawDurability")
        if rd is not None:
            raws.append(rd)
    raws.sort()

    if len(raws) <= 2 * top_n:
        return DUR_RAW_MIN, DUR_RAW_MAX

    # un-rescale: calibrated → intermediate (identity면 그대로)
    cur_range = DUR_RAW_MAX - DUR_RAW_MIN
    if abs(cur_range - 9.0) > 0.01:  # 이미 보정된 상태
        intermediates = sorted([
            DUR_RAW_MIN + (r - 1) * cur_range / 9 for r in raws
        ])
    else:
        intermediates = raws  # 초기 상태 (identity)

    # 하위 경계: rank-5와 rank-6 중간값
    tb_mid = (intermediates[top_n - 1] + intermediates[top_n]) / 2
    # 상위 경계: rank-5(from top)와 rank-6(from top) 중간값
    tt_mid = (intermediates[-(top_n + 1)] + intermediates[-top_n]) / 2

    # score=1.5 경계 = tb_mid, score=9.5 경계 = tt_mid
    # → RANGE = 9/8 * (tt_mid - tb_mid)
    dur_range = 9.0 / 8.0 * (tt_mid - tb_mid)
    new_min = tb_mid - 0.5 * dur_range / 9.0
    new_max = new_min + dur_range

    return round(new_min, 10), round(new_max, 10)


def compute_stab_anchors(shoes_data, top_n=5):
    """전체 신발의 rawStability로 STAB_RAW_MIN/MAX 반환.

    compute_dur_anchors()와 동일 알고리즘:
    - un-rescale → intermediate 복원
    - rank-(top_n)/(top_n+1) 경계 midpoint
    - RANGE = 9/8 * (top_mid - bottom_mid)
    """
    raws = []
    for shoe in shoes_data:
        rs = shoe.get("specs", {}).get("rawStability")
        if rs is not None:
            raws.append(rs)
    raws.sort()

    if len(raws) <= 2 * top_n:
        return STAB_RAW_MIN, STAB_RAW_MAX

    cur_range = STAB_RAW_MAX - STAB_RAW_MIN
    if abs(cur_range - 9.0) > 0.01:  # 이미 보정된 상태
        intermediates = sorted([
            STAB_RAW_MIN + (r - 1) * cur_range / 9 for r in raws
        ])
    else:
        intermediates = raws  # 초기 상태 (identity)

    tb_mid = (intermediates[top_n - 1] + intermediates[top_n]) / 2
    tt_mid = (intermediates[-(top_n + 1)] + intermediates[-top_n]) / 2

    dur_range = 9.0 / 8.0 * (tt_mid - tb_mid)
    new_min = tb_mid - 0.5 * dur_range / 9.0
    new_max = new_min + dur_range

    return round(new_min, 10), round(new_max, 10)
