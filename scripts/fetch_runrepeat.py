#!/usr/bin/env python3
"""
fetch_runrepeat.py — RunRepeat __NUXT_DATA__ JSON parser.

RunRepeat 페이지의 __NUXT_DATA__ 스크립트 태그에 lab 데이터가 서버사이드 렌더됨.
Playwright 불필요. Python stdlib (urllib.request, re, json) 로 직접 파싱.
토큰 비용 25x 절감: 페이지 스냅샷(~123K 문자) 대신 clean JSON(~3-5KB) 출력.

Nuxt 데이터 구조:
  - arr[state_dict]['lab_tests'] → lab_tests_dict
  - lab_tests_dict['tests'] → {test_id_str: test_obj_idx, ...}
  - test_obj: {slug: ptr, name: ptr, value: ptr|literal, units: ptr|literal}

Usage:
    python3 scripts/fetch_runrepeat.py --fetch URL [--shoe-id SHOEID]
    python3 scripts/fetch_runrepeat.py --explore URL
"""
import argparse
import json
import re
import urllib.error
import urllib.request
from datetime import date


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# Known test IDs from lab_tests.tests dict keys → (category, field_name, units)
# Verified against adizero-sl-2, hoka-clifton-9, and others.
#
# RunRepeat Methodology history:
#   ≤2.1 : Midsole softness measured in Shore A (HA durometer)
#    2.2  : Switched to Asker C (AC durometer) — 2026-02 update, ~1.96x larger values
#           Back-tested 200+ shoes so older shoes also have AC values.
#           HA fields kept for reference but DO NOT compare HA vs AC values.
#
# forefootShockAbsorption (ID=68) and forefootEnergyReturn (ID=66):
#   Not in tests[id].value path — live in product.lab.values dict instead.
#   build_test_index() falls back to that path automatically.
KNOWN_TEST_IDS = {
    # --- Cushioning: Shock Absorption (SA scale) ---
    67: ("cushioning",     "heelShockAbsorption",          "SA"),
    68: ("cushioning",     "forefootShockAbsorption",      "SA"),

    # --- Cushioning: Midsole Softness (HA, Methodology ≤2.1 legacy) ---
    # Kept for backwards compat. New shoes also have AC values below.
    11: ("cushioning",     "midsoleSoftness_ha",           "HA"),
    48: ("cushioning",     "secondaryFoamSoftness_ha",     "HA"),
    49: ("cushioning",     "midsoleSoftnessForefoot_ha",   "HA"),
    12: ("cushioning",     "midsoleSoftnessCold_ha",       "HA"),

    # --- Cushioning: Midsole Softness (AC, Methodology 2.2 — primary) ---
    70: ("cushioning",     "midsoleSoftness_ac",           "AC"),
    72: ("cushioning",     "secondaryFoamSoftness_ac",     "AC"),
    73: ("cushioning",     "midsoleSoftnessForefoot_ac",   "AC"),
    71: ("cushioning",     "midsoleSoftnessCold_ac",       "AC"),

    # --- Responsiveness: Energy Return (%) ---
    65: ("responsiveness", "heelEnergyReturn",             "%"),
    66: ("responsiveness", "forefootEnergyReturn",         "%"),

    # --- Stability ---
    17: ("stability",      "torsionalRigidity",            "/5"),
    19: ("stability",      "heelCounterStiffness",         "/5"),
    20: ("stability",      "lateralStability",             None),
    25: ("stability",      "midsoleWidthForefoot_mm",      "mm"),
    26: ("stability",      "midsoleWidthHeel_mm",          "mm"),

    # --- Durability ---
     9: ("durability",     "outsoleThickness_mm",          "mm"),
     4: ("durability",     "outsoleDurability_mm",         "mm"),
     2: ("durability",     "toeboxDurability",             None),
     3: ("durability",     "heelPaddingDurability",        None),

    # --- Physical ---
     5: ("physical",       "forefootStack_mm",             "mm"),
     6: ("physical",       "heelStack_mm",                 "mm"),
     8: ("physical",       "drop_mm",                      "mm"),
    24: ("physical",       "weight_g",                     "g"),
    59: ("physical",       "flexStiffness_n",              "N"),     # 3-point bend test
    14: ("physical",       "stiffness_n",                  "N"),     # different stiffness test
    15: ("physical",       "stiffnessCold_n",              "N"),
    16: ("physical",       "stiffnessCold_pct",            None),    # % change vs room temp
    58: ("physical",       "rocker_deg",                   "°"),
    60: ("physical",       "forefootTraction",             None),    # friction coefficient
    61: ("physical",       "heelTraction",                 None),
    69: ("physical",       "plate",                        None),

    # --- Size & Fit ---
    27: ("sizeAndFit",     "toeboxWidthWidest_mm",         "mm"),
    29: ("sizeAndFit",     "toeboxWidthBigToe_mm",         "mm"),
    32: ("sizeAndFit",     "internalLength_mm",            "mm"),
    57: ("sizeAndFit",     "toeboxHeight_mm",              "mm"),
    55: ("sizeAndFit",     "toeboxWidthWidestPart_mm",     "mm"),    # new measurement method
    56: ("sizeAndFit",     "toeboxWidthBigToePart_mm",     "mm"),    # new measurement method
    54: ("sizeAndFit",     "sizeRating",                   None),    # numeric; "Half size small" text is frontend-only

    # --- Misc ---
     1: ("misc",           "breathability",                None),
    10: ("misc",           "outsoleHardness_hc",           "HC"),
    37: ("misc",           "insoleThickness_mm",           "mm"),
    41: ("misc",           "removableInsole",              None),
    45: ("misc",           "reflectiveElements",           None),
    13: ("misc",           "midsoleSoftnessCold_pct",      None),    # % change in cold (AC method)
    38: ("misc",           "tonguePadding_mm",             "mm"),
    39: ("misc",           "tongueGussetType",             None),
    40: ("misc",           "heelTab",                      None),
}


def fetch_html(url):
    """urllib.request.Request(url, headers=HEADERS)로 GET. timeout=30."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_nuxt_array(html):
    """id="__NUXT_DATA__" 스크립트 태그 내용을 정규식으로 추출 후 json.loads."""
    m = re.search(r'id="__NUXT_DATA__">(.*?)</script>', html, re.DOTALL)
    if not m:
        raise ValueError("__NUXT_DATA__ script tag not found in HTML")
    return json.loads(m.group(1))


def resolve(array, idx, _depth=0):
    """Nuxt 배열 포인터 역참조.

    - _depth > 10이면 None 반환 (무한루프 방지)
    - idx가 int이고 0 <= idx < len(array)이면: resolve(array, array[idx], _depth+1)
    - 아니면: idx 그대로 반환 (리터럴 값)
    """
    if _depth > 10:
        return None
    if isinstance(idx, int) and 0 <= idx < len(array):
        return resolve(array, array[idx], _depth + 1)
    return idx


def _to_number(val):
    """문자열 값을 숫자로 변환. 변환 불가시 원본 반환."""
    if not isinstance(val, str):
        return val
    val_stripped = val.strip()
    try:
        if "." in val_stripped:
            return float(val_stripped)
        return int(val_stripped)
    except (ValueError, TypeError):
        return val  # keep as string (e.g., 'none', 'pull-tab')


def _extract_forefoot_value(array, test_id_str):
    """product.lab.values 딕셔너리에서 특정 test_id 값을 추출.

    forefootShockAbsorption(68), forefootEnergyReturn(66)은 tests[id].value 경로에
    없고 product.lab.values 경로에만 존재. 'sections'+'values' 키를 가진 dict가 해당 구조.
    """
    for elem in array:
        if not (isinstance(elem, dict) and "sections" in elem and "values" in elem):
            continue
        vals_ptr = elem["values"]
        if not (isinstance(vals_ptr, int) and 0 <= vals_ptr < len(array)):
            continue
        vals = array[vals_ptr]
        if not (isinstance(vals, dict) and all(k.isdigit() for k in vals.keys())):
            continue
        if test_id_str in vals:
            raw = resolve(array, vals[test_id_str])
            if isinstance(raw, (int, float)):
                return float(raw)
            if isinstance(raw, str):
                try:
                    return float(raw.replace(",", "."))
                except ValueError:
                    pass
        break
    return None


def build_test_index(array):
    """lab_tests.tests 섹션을 찾아 테스트 ID별 측정값 수집.

    Nuxt 구조:
      state_dict['lab_tests'] → lab_tests_dict
      lab_tests_dict['tests'] → {str(test_id): test_obj_idx, ...}

    반환: {test_id_int: {"name": str, "value": any, "units": str|None, "slug": str|None}}
    """
    result = {}

    # lab_tests 섹션 찾기: 'tests'와 'groups' 키를 모두 가진 dict
    for elem in array:
        if not (isinstance(elem, dict) and "tests" in elem and "groups" in elem):
            continue

        tests_ptr = elem["tests"]
        if not (isinstance(tests_ptr, int) and 0 <= tests_ptr < len(array)):
            continue
        tests_dict = array[tests_ptr]
        if not (isinstance(tests_dict, dict) and tests_dict):
            continue
        # 키가 모두 숫자 문자열인지 확인
        if not all(k.isdigit() for k in tests_dict.keys()):
            continue

        # 각 테스트 항목 추출
        for key_str, test_idx_ptr in tests_dict.items():
            test_id = int(key_str)
            test_obj = resolve(array, test_idx_ptr)
            if not isinstance(test_obj, dict):
                continue

            slug = resolve(array, test_obj["slug"]) if "slug" in test_obj else None
            name = resolve(array, test_obj["name"]) if "name" in test_obj else None

            # value: int 포인터이면 역참조, 아니면 리터럴
            value_raw = test_obj.get("value")
            if isinstance(value_raw, int) and 0 <= value_raw < len(array):
                value = resolve(array, value_raw)
            else:
                value = value_raw

            # 문자열 숫자 → 실제 숫자 변환
            value = _to_number(value)

            units = resolve(array, test_obj["units"]) if "units" in test_obj else None
            if units == "":
                units = None

            result[test_id] = {
                "name": name,
                "value": value,
                "units": units,
                "slug": slug,
            }

        # 첫 번째로 찾은 lab_tests 섹션 사용 (중복 방지)
        break

    # forefootShockAbsorption(68), forefootEnergyReturn(66)은 product.lab.values에서 fallback
    for test_id in (66, 68):
        if test_id in result and result[test_id]["value"] is not None:
            continue
        val = _extract_forefoot_value(array, str(test_id))
        if val is not None:
            if test_id in result:
                result[test_id]["value"] = val
            else:
                result[test_id] = {"name": None, "value": val, "units": None, "slug": None}

    return result


def extract_weight_g(array):
    """배열에서 oz/g 형식 문자열을 스캔하여 무게(g) 추출.

    '8.6 oz / 245' → 245, '8.7 oz (247g)' → 247 등의 패턴 처리.
    단독 'NNNg' 패턴은 경쟁 신발 무게 오추출 위험이 있어 제외.
    """
    for elem in array:
        if not isinstance(elem, str):
            continue
        # "8.6 oz / 245", "8.7 oz (247g)", "8.7 oz or 247g" 등
        m = re.search(r"\d+\.?\d*\s*oz\s*(?:/|\(|or)\s*(\d+)\s*g?\s*\)?", elem)
        if m:
            val = int(m.group(1))
            if 50 < val < 600:
                return val
    return None


def map_fields(test_index, array):
    """KNOWN_TEST_IDS 매핑 적용 → 구조화된 dict 반환."""
    out = {
        "cushioning": {},
        "responsiveness": {},
        "stability": {},
        "durability": {},
        "physical": {},
        "sizeAndFit": {},
        "misc": {},
        "unknown_test_ids": {},
    }

    for test_id, info in test_index.items():
        if test_id in KNOWN_TEST_IDS:
            category, field_name, _ = KNOWN_TEST_IDS[test_id]
            value = info["value"]
            # weight_g: 숫자가 아니거나 유효 범위(50-600g)를 벗어나면 oz/g 형식에서 파싱
            if field_name == "weight_g" and not (
                isinstance(value, (int, float)) and 50 < value < 600
            ):
                value = extract_weight_g(array)
            out[category][field_name] = value
        else:
            out["unknown_test_ids"][str(test_id)] = {
                "name": info["name"],
                "value": info["value"],
                "units": info["units"],
                "slug": info["slug"],
            }

    # weight_g fallback: test_id=24가 lab_tests에 없어도 Nuxt 배열에서 추출 시도
    if out["physical"].get("weight_g") is None:
        out["physical"]["weight_g"] = extract_weight_g(array)

    return out


def explore_mode(url):
    """발견된 모든 테스트 ID + 값 출력 (ID 발견용)."""
    html = fetch_html(url)
    array = extract_nuxt_array(html)
    test_index = build_test_index(array)

    if not test_index:
        print("No lab_tests found. Check __NUXT_DATA__ structure.")
        return

    for tid in sorted(test_index.keys()):
        info = test_index[tid]
        known_label = (
            f"  [{KNOWN_TEST_IDS[tid][1]}]" if tid in KNOWN_TEST_IDS else "  [UNKNOWN]"
        )
        print(
            f"ID={tid:<5} "
            f"slug={str(info['slug']):<45} "
            f"value={str(info['value']):<15} "
            f"units={str(info['units']):<8}"
            f"{known_label}"
        )


def fetch_mode(url, shoe_id=None):
    """구조화 JSON을 반환 (stdout 출력용)."""
    html = fetch_html(url)
    array = extract_nuxt_array(html)
    test_index = build_test_index(array)
    fields = map_fields(test_index, array)

    return {
        "shoeId": shoe_id or "",
        "fetch_date": date.today().isoformat(),
        "fetch_method": "nuxt_data_json",
        **fields,
    }


def main():
    parser = argparse.ArgumentParser(
        description="RunRepeat __NUXT_DATA__ lab data parser — Playwright 대체"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--fetch",
        metavar="URL",
        help="구조화 JSON을 stdout으로 출력 (Codex 사용)",
    )
    group.add_argument(
        "--explore",
        metavar="URL",
        help="발견된 모든 테스트 ID + 값 출력 (ID 발견용)",
    )
    parser.add_argument(
        "--shoe-id",
        metavar="SHOEID",
        help="출력 JSON에 포함할 shoe ID (선택적)",
    )
    args = parser.parse_args()

    if args.explore:
        explore_mode(args.explore)
    elif args.fetch:
        data = fetch_mode(args.fetch, args.shoe_id)
        print(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
