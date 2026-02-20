#!/usr/bin/env python3
"""
calibrate_rtings.py

RunRepeat + RTINGS 모두 보유한 신발에서
RTINGS 공식 적용 결과 vs 현재 생산 스코어 비교 분석.

목적: RTINGS 공식의 bias/상관계수를 파악해 normalize_from_rtings.py 공식 조정에 활용.
사용법: python3 scripts/calibrate_rtings.py
"""

import json
import statistics
from pathlib import Path

from formulas import clamp, cushioning_from_rtings, responsiveness_from_rtings

RESEARCH_DIR = Path(__file__).parent.parent / "research" / "2026-02-18"
BRANDS_DIR = Path(__file__).parent.parent / "data" / "brands"


def get_attempt_status(attempt_log, source_name):
    for entry in attempt_log:
        if entry["source"] == source_name:
            return entry["status"]
    return None


def get_source(sources, source_name):
    for s in sources:
        if s["source"] == source_name:
            return s
    return None


def load_production():
    """Returns {shoe_id: {"brand": str, "subcategoryId": str, "specs": dict}}"""
    production = {}
    for fpath in sorted(BRANDS_DIR.glob("*.json")):
        with open(fpath) as f:
            data = json.load(f)
        brand_id = data["brand"]["id"]
        for shoe in data["shoes"]:
            production[shoe["id"]] = {
                "brand": brand_id,
                "subcategoryId": shoe.get("subcategoryId", ""),
                "specs": shoe.get("specs", {}),
            }
    return production


def compute_rtings_scores(rtings_src, subcategoryId):
    """
    RTINGS 공식 적용 (캘리브레이션용 — 페널티 적용 전 raw bias 측정).
    - cushioning = round((heel + forefoot) / 2)
    - responsiveness = clamp(round(avg_er / 10), 1, 10), max-cushion만 -1
    Returns (cushioning, responsiveness) — None if data missing
    """
    cush = rtings_src["attributeScores"]["cushioning"]
    resp = rtings_src["attributeScores"]["responsiveness"]

    heel_cush = cush.get("heelShockAbsorption")
    fore_cush = cush.get("forefootShockAbsorption")
    cushioning = None
    if heel_cush is not None and fore_cush is not None:
        cushioning = cushioning_from_rtings(heel_cush, fore_cush)

    heel_er = resp.get("heelEnergyReturn")
    fore_er = resp.get("forefootEnergyReturn")
    responsiveness = None
    if heel_er is not None and fore_er is not None:
        avg_er = (heel_er + fore_er) / 2
        responsiveness = clamp(round(avg_er / 10), 1, 10)
        if subcategoryId == "max-cushion":
            responsiveness = clamp(responsiveness - 1, 1, 10)

    return cushioning, responsiveness


def main():
    production = load_production()

    results = []

    for brand_dir in sorted(RESEARCH_DIR.iterdir()):
        if not brand_dir.is_dir():
            continue
        for fpath in sorted(brand_dir.glob("*.json")):
            if fpath.name == "batch-summary.json":
                continue
            with open(fpath) as f:
                research = json.load(f)

            shoe_id = research["shoeId"]
            if shoe_id not in production:
                continue

            attempt_log = research.get("attemptLog", [])
            rr_status = get_attempt_status(attempt_log, "RunRepeat")
            rt_status = get_attempt_status(attempt_log, "RTINGS")

            # 캘리브레이션 대상: RunRepeat AND RTINGS 모두 found
            if rr_status != "found" or rt_status != "found":
                continue

            rtings_src = get_source(research.get("sources", []), "RTINGS")
            if rtings_src is None:
                continue

            prod = production[shoe_id]
            subcatId = prod["subcategoryId"]
            prod_specs = prod["specs"]

            rtings_cush, rtings_resp = compute_rtings_scores(rtings_src, subcatId)

            prod_cush = prod_specs.get("cushioning")
            prod_resp = prod_specs.get("responsiveness")

            if rtings_cush is not None and prod_cush is not None:
                results.append({
                    "shoeId": shoe_id,
                    "brand": prod["brand"],
                    "subcatId": subcatId,
                    "field": "cushioning",
                    "rtings": rtings_cush,
                    "production": prod_cush,
                    "diff": rtings_cush - prod_cush,
                })

            if rtings_resp is not None and prod_resp is not None:
                results.append({
                    "shoeId": shoe_id,
                    "brand": prod["brand"],
                    "subcatId": subcatId,
                    "field": "responsiveness",
                    "rtings": rtings_resp,
                    "production": prod_resp,
                    "diff": rtings_resp - prod_resp,
                })

    # 리포트 출력
    print(f"\n=== RTINGS 캘리브레이션 분석 ===")
    print(f"분석 대상: RunRepeat + RTINGS 모두 보유한 생산 신발\n")

    for field in ["cushioning", "responsiveness"]:
        field_data = [r for r in results if r["field"] == field]
        if not field_data:
            print(f"{field}: 데이터 없음\n")
            continue

        diffs = [r["diff"] for r in field_data]
        print(f"=== {field} ({len(field_data)}개 신발) ===")
        print(f"  RTINGS 공식 평균 bias:  {statistics.mean(diffs):+.2f}")
        if len(diffs) > 1:
            print(f"  표준편차:               {statistics.stdev(diffs):.2f}")
        print(f"  범위:                   {min(diffs):+d} ~ {max(diffs):+d}")
        print(f"  일치 (diff=0):          {sum(1 for d in diffs if d == 0)}개")
        print(f"  RTINGS 과대평가 (diff>0): {sum(1 for d in diffs if d > 0)}개")
        print(f"  RTINGS 과소평가 (diff<0): {sum(1 for d in diffs if d < 0)}개")

        print(f"\n  {'shoeId':<40} {'brand':<12} {'subcat':<14} {'rtings':>6} {'prod':>6} {'diff':>6}")
        print("  " + "-" * 82)
        for r in sorted(field_data, key=lambda x: x["diff"]):
            print(
                f"  {r['shoeId']:<40} {r['brand']:<12} {r['subcatId']:<14}"
                f" {r['rtings']:>6} {r['production']:>6} {r['diff']:>+6}"
            )
        print()

    total = len(set(r["shoeId"] for r in results))
    print(f"총 {total}개 신발 분석됨.")


if __name__ == "__main__":
    main()
