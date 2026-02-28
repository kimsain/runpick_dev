#!/usr/bin/env python3
"""
fetch_rtings.py — RTINGS 자동 수집 스크립트

RTINGS 내부 API (POST /api/v2/safe/app/product_vue_page__page_body)를 통해
신발 측정 데이터를 수집한다. 쿠키 불필요.

사용:
    python3 scripts/fetch_rtings.py --fetch https://www.rtings.com/running-shoes/reviews/brand/model
    python3 scripts/fetch_rtings.py --fetch URL --shoe-id my-shoe-id
    python3 scripts/fetch_rtings.py --explore URL   # 모든 테스트 필드 출력

참고: fetch_runrepeat.py와 동일한 CLI 패턴. 출력은 stdout JSON.
"""
import argparse
import json
import re
import sys
from datetime import date
from urllib.error import URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

API_URL = "https://www.rtings.com/api/v2/safe/app/product_vue_page__page_body"

HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.rtings.com/",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://www.rtings.com",
}

# TEST_MAP: test.name → (그룹, 필드명, 추출방식, 정규식)
# 추출방식: "value" = rendered_value에서 regex 추출, "score" = score 필드 직접 사용
# regex가 None인 경우: rendered_value 문자열 그대로 사용
TEST_MAP = {
    # ─── Responsiveness (Energy Return %) ───
    "Heel Energy Return":             ("responsiveness", "heelEnergyReturn_pct",       "value", r"([\d.]+)%"),
    "Forefoot Energy Return":         ("responsiveness", "forefootEnergyReturn_pct",   "value", r"([\d.]+)%"),

    # ─── Cushioning (Shock Absorption /10) ───
    "Heel Cushioning":                ("cushioning", "heelShockAbsorption",            "score", None),
    "Forefoot Cushioning":            ("cushioning", "forefootShockAbsorption",        "score", None),
    "Heel Firmness":                  ("cushioning", "heelFirmnessScore",              "score", None),
    "Forefoot Firmness":              ("cushioning", "forefootFirmnessScore",          "score", None),
    "Forefoot Long Run Cushioning":   ("cushioning", "longRunForefoot_score",          "score", None),

    # ─── Firmness (N/mm) ───
    "Firmness At 550N":               ("firmnessHeel",     "at550N_Nmm",   "value", r"([\d.]+)\s*N/mm"),
    "Firmness At 1100N":              ("firmnessHeel",     "at1100N_Nmm",  "value", r"([\d.]+)\s*N/mm"),
    "Firmness At 1900N":              ("firmnessHeel",     "at1900N_Nmm",  "value", r"([\d.]+)\s*N/mm"),
    "Firmness At 800N":               ("firmnessForefoot", "at800N_Nmm",   "value", r"([\d.]+)\s*N/mm"),
    "Firmness At 1300N":              ("firmnessForefoot", "at1300N_Nmm",  "value", r"([\d.]+)\s*N/mm"),
    "Firmness At 2050N":              ("firmnessForefoot", "at2050N_Nmm",  "value", r"([\d.]+)\s*N/mm"),

    # ─── Energy Absorbed (J) ───
    "Energy Absorbed At 550N":        ("energyHeel",      "at550N_J",     "value", r"([\d.]+)\s*J"),
    "Energy Absorbed At 1100N":       ("energyHeel",      "at1100N_J",    "value", r"([\d.]+)\s*J"),
    "Energy Absorbed At 1900N":       ("energyHeel",      "at1900N_J",    "value", r"([\d.]+)\s*J"),
    "Energy Absorbed At 800N":        ("energyForefoot",  "at800N_J",     "value", r"([\d.]+)\s*J"),
    "Energy Absorbed At 1300N":       ("energyForefoot",  "at1300N_J",    "value", r"([\d.]+)\s*J"),
    "Energy Absorbed At 2050N":       ("energyForefoot",  "at2050N_J",    "value", r"([\d.]+)\s*J"),

    # ─── Long Run Cushioning (J) ───
    "Energy Absorbed At 10km":        ("longRun", "at10km_J",  "value", r"([\d.]+)\s*J"),
    "Energy Absorbed At 20km":        ("longRun", "at20km_J",  "value", r"([\d.]+)\s*J"),
    "Energy Absorbed At 30km":        ("longRun", "at30km_J",  "value", r"([\d.]+)\s*J"),
    "Energy Absorbed At 40km":        ("longRun", "at40km_J",  "value", r"([\d.]+)\s*J"),

    # ─── Physical ───
    "Weight":                         ("physical", "weight_g",                "value", r"([\d.]+)\s*g"),
    "Heel Stack Height":              ("physical", "heelStack_mm",            "value", r"([\d.]+)\s*mm"),
    "Forefoot Stack Height":          ("physical", "forefootStack_mm",        "value", r"([\d.]+)\s*mm"),
    "Heel-To-Toe Drop":               ("physical", "drop_mm",                 "value", r"([\d.]+)\s*mm"),
    "Advertised Heel-To-Toe Drop":    ("physical", "advertisedDrop_mm",       "value", r"([\d.]+)\s*mm"),
    "Outsole Heel Width":             ("physical", "outsoleHeelWidth_mm",     "value", r"(\d+)\s*mm"),
    "Outsole Arch Width":             ("physical", "outsoleArchWidth_mm",     "value", r"(\d+)\s*mm"),
    "Outsole Forefoot Width":         ("physical", "outsoleForefootWidth_mm", "value", r"(\d+)\s*mm"),
    "Internal Length":                ("physical", "internalLength_mm",       "value", r"(\d+)\s*mm"),
    "Internal Heel Width":            ("physical", "internalHeelWidth_mm",    "value", r"(\d+)\s*mm"),
    "Internal Forefoot Width":        ("physical", "internalForefootWidth_mm","value", r"(\d+)\s*mm"),
    "Heel Width-To-Stack Ratio":      ("physical", "heelWidthToStackRatio",   "value", r"([\d.]+)"),
    "Forefoot Width-To-Stack Ratio":  ("physical", "forefootWidthToStackRatio","value",r"([\d.]+)"),

    # ─── Design ───
    "Plate":                          ("design", "plate",               "value", None),
    "Tongue Gusset Type":             ("design", "tongueGussetType",    "value", None),
    "Wide Sizing Available":          ("design", "wideSizingAvailable", "value", None),

    # ─── Fit (scores) ───
    "Length Fit":                     ("fit", "lengthFitScore",         "score", None),
    "Forefoot Fit: Width":            ("fit", "forefootWidthFitScore",  "score", None),
    "Arch Fit: Width":                ("fit", "archWidthFitScore",      "score", None),
    "Forefoot Fit: Height":           ("fit", "forefootHeightFitScore", "score", None),

    # ─── Fit (TTS deviations mm) ───
    "Toe TTS Deviation":              ("fit", "toeTtsDeviation_mm",        "value", r"(-?[\d.]+)\s*mm"),
    "Ball-Of-Foot TTS Deviation":     ("fit", "ballOfFootTtsDeviation_mm", "value", r"(-?[\d.]+)\s*mm"),
    "Arch Width TTS Deviation":       ("fit", "archWidthTtsDeviation_mm",  "value", r"(-?[\d.]+)\s*mm"),
}


def fetch_raw(url_path: str) -> dict:
    """RTINGS URL path → raw API JSON response.

    Args:
        url_path: e.g. "/running-shoes/reviews/asics/metaspeed-sky-tokyo"

    Raises:
        ValueError: HTTP 4xx/5xx 또는 JSON 파싱 실패
        URLError: 네트워크 오류
    """
    payload = json.dumps({
        "variables": {
            "url": url_path,
            "named_version": "public",
            "version_id": None,
        }
    }).encode()
    req = Request(API_URL, data=payload, headers=HEADERS, method="POST")
    with urlopen(req, timeout=30) as resp:
        status = resp.status
        body = resp.read()
    if status != 200:
        raise ValueError(f"HTTP {status}: {body[:200]}")
    try:
        return json.loads(body)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON 파싱 실패: {e}\n응답 앞 200자: {body[:200]}")


def url_to_path(full_url: str) -> str:
    """'https://www.rtings.com/running-shoes/...' → '/running-shoes/...'"""
    return urlparse(full_url).path.rstrip("/")


def get_test_results(data: dict) -> list:
    """Extract test_results list from API response."""
    return data["data"]["page"]["product"]["review"]["test_results"]


def get_product_meta(data: dict) -> dict:
    """Extract product metadata from API response."""
    product = data["data"]["page"]["product"]
    return {
        "id": product.get("id"),
        "fullname": product.get("fullname"),
        "brand": product.get("brand", {}).get("name"),
        "url_part": product.get("full_url_part"),
    }


def extract_all(test_results: dict) -> dict:
    """test_results dict → 그룹별 필드 딕셔너리.

    중복 이름 처리:
    - "value" 모드: regex 매칭되는 첫 번째 항목 선택
    - "score" 모드: score != null인 첫 번째 항목 선택
    값이 없는 필드는 None으로 저장.
    """
    # 이름별로 모든 매칭 항목 수집
    by_name: dict = {}
    for tr in test_results:
        name = (tr.get("test") or {}).get("name")
        if name:
            by_name.setdefault(name, []).append(tr)

    groups: dict = {}

    for test_name, (group, field, mode, pattern) in TEST_MAP.items():
        candidates = by_name.get(test_name, [])
        value = None

        if mode == "value":
            for tr in candidates:
                raw = tr.get("rendered_value")
                if raw is None:
                    continue
                if pattern is None:
                    value = str(raw)
                    break
                m = re.search(pattern, str(raw))
                if m:
                    value = float(m.group(1))
                    break

        elif mode == "score":
            for tr in candidates:
                s = tr.get("score")
                if s is not None:
                    value = float(s)
                    break

        groups.setdefault(group, {})[field] = value

    # 미매핑 필드: TEST_MAP에 없는 항목을 unknown_fields로 수집 (drift 감지용)
    mapped_names = set(TEST_MAP.keys())
    unknown = {}
    for tr in test_results:
        name = (tr.get("test") or {}).get("name")
        if name and name not in mapped_names:
            t_id = (tr.get("test") or {}).get("id", "?")
            val = tr.get("rendered_value")
            score = tr.get("score")
            if val is not None or score is not None:
                unknown[f"{name}(id={t_id})"] = {"value": val, "score": score}
    if unknown:
        groups["unknown_fields"] = unknown

    return groups


def explore_mode(data: dict):
    """탐색 모드: 모든 테스트 필드를 탭 구분으로 출력."""
    test_results = get_test_results(data)
    print(f"{'IDX':<5} {'TEST_ID':<8} {'NAME':<45} {'VALUE':<30} {'SCORE':<8} {'INSIDER'}")
    print("-" * 110)
    for idx, tr in enumerate(test_results):
        test = tr.get("test") or {}
        name = test.get("name", "?")
        t_id = test.get("id", "?")
        val = tr.get("rendered_value") or ""
        score = tr.get("score")
        insider = "✓" if tr.get("insider_only") else ""
        print(f"{idx:<5} {t_id:<8} {name:<45} {str(val):<30} {str(score):<8} {insider}")


def fetch_mode(data: dict, url_path: str, shoe_id: str):
    """수집 모드: 전체 필드 파싱 후 JSON stdout 출력."""
    test_results = get_test_results(data)
    meta = get_product_meta(data)
    groups = extract_all(test_results)

    # normalize_from_rtings.py 호환 attributeScores 섹션
    r = groups.get("responsiveness", {})
    c = groups.get("cushioning", {})
    attribute_scores = {
        "cushioning": {
            "heelShockAbsorption":     c.get("heelShockAbsorption"),
            "forefootShockAbsorption": c.get("forefootShockAbsorption"),
            "scale": "/10",
        },
        "responsiveness": {
            "heelEnergyReturn":    r.get("heelEnergyReturn_pct"),
            "forefootEnergyReturn":r.get("forefootEnergyReturn_pct"),
            "scale": "%",
        },
        "stability": {
            "torsionalRigidity":    None,  # RTINGS 미측정
            "heelCounterStiffness": None,
            "scale": "/10",
        },
        "durability": {
            "outsoleDurability": None,  # RTINGS 미측정
            "scale": "mm",
        },
    }

    output = {
        "shoeId": shoe_id,
        "url": url_path,
        "fetch_date": str(date.today()),
        "fetch_method": "rtings_api_v2",
        "productInfo": meta,
        "attributeScores": attribute_scores,  # normalize_from_rtings.py 호환
        **groups,                              # 전체 raw 필드
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser(description="RTINGS 신발 데이터 수집")
    parser.add_argument("--fetch", metavar="URL", help="수집할 RTINGS 리뷰 URL")
    parser.add_argument("--shoe-id", metavar="ID", help="출력 JSON에 포함할 신발 ID")
    parser.add_argument("--explore", metavar="URL", help="모든 테스트 필드 목록 출력 (탐색용)")
    args = parser.parse_args()

    if not args.fetch and not args.explore:
        parser.print_help()
        sys.exit(1)

    url = args.fetch or args.explore
    url_path = url_to_path(url)

    try:
        data = fetch_raw(url_path)
    except URLError as e:
        print(f"[ERROR] API 호출 실패: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] 예상치 못한 오류: {e}", file=sys.stderr)
        sys.exit(1)

    if args.explore:
        explore_mode(data)
    else:
        fetch_mode(data, url_path, args.shoe_id)


if __name__ == "__main__":
    main()
