#!/usr/bin/env python3
"""
compute_raw_scores.py — 소수점 정밀도 rawCushioning / rawResponsiveness 계산

RunRepeat SA값 및 RTINGS /10값을 0-10 스케일로 정규화하여
data/brands/*.json 의 specs 에 upsert 한다.

RunRepeat 우선, 없으면 RTINGS fallback.

사용법:
  python3 scripts/compute_raw_scores.py           # dry-run
  python3 scripts/compute_raw_scores.py --apply   # 실제 업데이트
"""

import argparse
import json
from pathlib import Path

from formulas import (
    clamp,
    raw_cushioning_from_runrepeat,
    raw_cushioning_from_rtings,
    raw_responsiveness_from_runrepeat,
    raw_responsiveness_from_rtings,
)

RESEARCH_DIR = Path(__file__).parent.parent / "research" / "2026-02-18"
BRANDS_DIR = Path(__file__).parent.parent / "data" / "brands"


def compute_raw(sources):
    """
    Returns (rawCushioning, rawResponsiveness) — either may be None if data missing.
    """
    rr = next((s for s in sources if s["source"] == "RunRepeat"), None)
    rt = next((s for s in sources if s["source"] == "RTINGS"), None)

    raw_cushion = raw_resp = None

    # rawCushioning: RunRepeat SA 우선
    if rr:
        c = rr.get("attributeScores", {}).get("cushioning", {})
        h_sa = c.get("heelShockAbsorption")
        f_sa = c.get("forefootShockAbsorption")
        if h_sa is not None and f_sa is not None:
            raw_cushion = raw_cushioning_from_runrepeat(h_sa, f_sa)
    if raw_cushion is None and rt:
        c = rt.get("attributeScores", {}).get("cushioning", {})
        h_c = c.get("heelShockAbsorption")
        f_c = c.get("forefootShockAbsorption")
        if h_c is not None and f_c is not None:
            raw_cushion = raw_cushioning_from_rtings(h_c, f_c)

    # rawResponsiveness: RunRepeat ER% 우선
    if rr:
        r = rr.get("attributeScores", {}).get("responsiveness", {})
        h_er = r.get("heelEnergyReturn")
        f_er = r.get("forefootEnergyReturn")
        if h_er is not None and f_er is not None:
            raw_resp = raw_responsiveness_from_runrepeat(h_er, f_er)
    if raw_resp is None and rt:
        r = rt.get("attributeScores", {}).get("responsiveness", {})
        h_er = r.get("heelEnergyReturn")
        f_er = r.get("forefootEnergyReturn")
        if h_er is not None and f_er is not None:
            raw_resp = raw_responsiveness_from_rtings(h_er, f_er)

    return raw_cushion, raw_resp


def load_production():
    """Returns {shoe_id: {"brand_file": Path, "brand_id": str}}"""
    prod_map = {}
    for fpath in sorted(BRANDS_DIR.glob("*.json")):
        with open(fpath) as f:
            data = json.load(f)
        for shoe in data["shoes"]:
            prod_map[shoe["id"]] = {
                "brand_file": fpath,
                "brand_id": data["brand"]["id"],
            }
    return prod_map


def main():
    parser = argparse.ArgumentParser(description="rawCushioning/rawResponsiveness 계산")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="실제로 data/brands/*.json 업데이트 (없으면 dry-run)",
    )
    args = parser.parse_args()

    production = load_production()

    # Collect updates: {brand_file: {shoe_id: {rawCushioning, rawResponsiveness}}}
    updates: dict = {}
    preview_rows = []

    for brand_dir in sorted(RESEARCH_DIR.iterdir()):
        if not brand_dir.is_dir():
            continue
        for fpath in sorted(brand_dir.glob("*.json")):
            if fpath.name == "batch-summary.json":
                continue
            with open(fpath) as f:
                research = json.load(f)

            shoe_id = research.get("shoeId")
            if shoe_id not in production:
                continue

            raw_c, raw_r = compute_raw(research.get("sources", []))
            if raw_c is None and raw_r is None:
                continue

            brand_file = production[shoe_id]["brand_file"]
            if brand_file not in updates:
                updates[brand_file] = {}
            updates[brand_file][shoe_id] = {
                "rawCushioning": raw_c,
                "rawResponsiveness": raw_r,
            }
            preview_rows.append({
                "shoeId": shoe_id,
                "brand": production[shoe_id]["brand_id"],
                "rawCushioning": raw_c,
                "rawResponsiveness": raw_r,
            })

    mode_label = "적용 모드" if args.apply else "Dry-run (--apply 없으면 변경 없음)"
    print(f"\n=== compute_raw_scores ({len(preview_rows)}개 신발) [{mode_label}] ===\n")

    print(f"{'shoeId':<42} {'brand':<12} {'rawCushioning':>14} {'rawResponsiveness':>18}")
    print("-" * 92)
    for r in preview_rows:
        rc = f"{r['rawCushioning']:.1f}" if r["rawCushioning"] is not None else "N/A"
        rr = f"{r['rawResponsiveness']:.1f}" if r["rawResponsiveness"] is not None else "N/A"
        print(f"{r['shoeId']:<42} {r['brand']:<12} {rc:>14} {rr:>18}")

    if not args.apply:
        print("\n▶ --apply 플래그 추가 시 data/brands/*.json에 실제 적용됩니다.")
        return

    print("\n[적용 중...]")
    updated_shoes = 0

    for brand_file, shoe_updates in sorted(updates.items()):
        with open(brand_file) as f:
            data = json.load(f)

        file_changed = False
        for shoe in data["shoes"]:
            sid = shoe["id"]
            if sid not in shoe_updates:
                continue
            u = shoe_updates[sid]
            specs = shoe.setdefault("specs", {})
            for field in ("rawCushioning", "rawResponsiveness"):
                val = u[field]
                if val is not None:
                    old = specs.get(field)
                    specs[field] = val
                    if old != val:
                        print(f"  {brand_file.name}/{sid}: {field} {old} → {val}")
                        file_changed = True
            if file_changed:
                updated_shoes += 1

        if file_changed:
            with open(brand_file, "w") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write("\n")

    print(f"\n완료: {updated_shoes}개 신발 업데이트")


if __name__ == "__main__":
    main()
