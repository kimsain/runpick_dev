#!/usr/bin/env python3
"""
normalize_from_runrepeat.py  — RunRepeat 계측치 기반 정규화

RunRepeat 계측치(SA, ER%, TR, HCS, 내구성)가 있는 신발의 스코어를 정규화.
RTINGS 유무와 무관하게 RunRepeat found 신발 전체에 적용.

사용법:
  python3 scripts/normalize_from_runrepeat.py --dry-run   # preview
  python3 scripts/normalize_from_runrepeat.py --apply      # 실제 업데이트
"""

import argparse
import json
from pathlib import Path

from formulas import (
    cushioning_from_runrepeat,
    responsiveness_from_runrepeat,
    raw_cushioning_from_runrepeat,
    raw_responsiveness_from_runrepeat,
)
from research_utils import resolve_research_files, describe_date_range
from stability_durability_v3 import derive_signals, compute_stability_v3, compute_durability_v3

BRANDS_DIR = Path(__file__).parent.parent / "data" / "brands"

RR_FOUND_STATUSES = {"found", "found_via_shared_midsole"}


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


def get_qualitative_findings(sources):
    """RunRepeat/RTINGS 제외 소스들의 keyFindings 텍스트 합산."""
    findings = []
    for src in sources:
        if src["source"] not in ("RunRepeat", "RTINGS"):
            findings.extend(src.get("keyFindings", []))
    return " ".join(findings)


def compute_scores(sources, rr_src, existing_specs, subcategoryId=None):
    """RunRepeat 우선 + V3 stability/durability 조립."""
    derived = derive_signals(sources)
    rr_cush = rr_src["attributeScores"]["cushioning"]
    rr_resp = rr_src["attributeScores"]["responsiveness"]

    # cushioning from RunRepeat SA values
    heel_sa = rr_cush.get("heelShockAbsorption")
    fore_sa = rr_cush.get("forefootShockAbsorption")
    cushioning = None
    raw_cush = None
    if heel_sa is not None and fore_sa is not None:
        cushioning = cushioning_from_runrepeat(heel_sa, fore_sa)
        raw_cush = raw_cushioning_from_runrepeat(heel_sa, fore_sa)

    # responsiveness from RunRepeat ER%
    heel_er = rr_resp.get("heelEnergyReturn")
    fore_er = rr_resp.get("forefootEnergyReturn")
    responsiveness = None
    raw_resp = None
    if heel_er is not None and fore_er is not None:
        responsiveness = responsiveness_from_runrepeat(heel_er, fore_er)
        raw_resp = raw_responsiveness_from_runrepeat(heel_er, fore_er)

    stability, raw_stab, stab_components, derived = compute_stability_v3(
        sources,
        existing_specs,
        subcategoryId,
        derived=derived,
    )
    durability, raw_dur, dur_components, derived = compute_durability_v3(
        sources,
        existing_specs,
        derived=derived,
    )

    return (
        cushioning,
        responsiveness,
        stability,
        durability,
        raw_cush,
        raw_resp,
        raw_stab,
        raw_dur,
        stab_components,
        dur_components,
        derived,
    )


def fmt_change(old, new, width=12):
    if new is None:
        return f"{'N/A':>{width}}"
    if old == new:
        return f"{new:>{width}}"
    arrow = f"{old}→{new}"
    return f"{arrow:>{width}}"


def main():
    parser = argparse.ArgumentParser(description="RunRepeat 계측치 기반 정규화")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="Preview only")
    group.add_argument("--apply", action="store_true", help="Apply to brand JSON files")
    parser.add_argument("--date", metavar="YYYY-MM-DD", help="리서치 날짜 (기본: 최신)")
    parser.add_argument("--shoe-id", metavar="ID", help="특정 신발만 처리")
    args = parser.parse_args()

    research_files = resolve_research_files(args.date)
    production = load_production()

    updates_by_brand: dict = {}
    research_updates: dict = {}
    preview_rows = []

    for fpath in research_files:
        with open(fpath) as f:
            research = json.load(f)

        shoe_id = research["shoeId"]
        if args.shoe_id and shoe_id != args.shoe_id:
            continue
        if shoe_id not in production:
            continue

        attempt_log = research.get("attemptLog", [])
        rr_status = get_attempt_status(attempt_log, "RunRepeat")
        # RunRepeat 계측치 기반: RTINGS 유무 무관
        if rr_status not in RR_FOUND_STATUSES:
            continue

        rr_src = get_source(research.get("sources", []), "RunRepeat")
        if rr_src is None:
            continue

        prod = production[shoe_id]
        old_specs = prod["specs"]

        (
            new_cush,
            new_resp,
            new_stab,
            new_dur,
            new_raw_cush,
            new_raw_resp,
            new_raw_stab,
            new_raw_dur,
            stab_components,
            dur_components,
            derived_signals,
        ) = compute_scores(
            research.get("sources", []),
            rr_src,
            old_specs,
            subcategoryId=prod["subcategoryId"],
        )

        brand_id = prod["brand"]
        if brand_id not in updates_by_brand:
            updates_by_brand[brand_id] = []
        updates_by_brand[brand_id].append({
            "shoeId": shoe_id,
            "cushioning": new_cush,
            "responsiveness": new_resp,
            "stability": new_stab,
            "durability": new_dur,
            "rawCushioning": new_raw_cush,
            "rawResponsiveness": new_raw_resp,
            "rawStability": new_raw_stab,
            "rawDurability": new_raw_dur,
            "stabilityComponents": stab_components,
            "durabilityComponents": dur_components,
        })
        research_updates[shoe_id] = {
            "fpath": fpath,
            "derivedSignals": derived_signals,
            "proposedScores": {
                "cushioning": new_cush,
                "responsiveness": new_resp,
                "stability": new_stab,
                "durability": new_dur,
            },
            "specsDecision": (
                "[normalize_from_runrepeat.py] Stability/Durability V3 rollout applied. "
                "RunRepeat core + structured qualitative signals reflected in proposedScores."
            ),
        }

        preview_rows.append({
            "shoeId": shoe_id,
            "brand": brand_id,
            "old_cush": old_specs.get("cushioning"),
            "new_cush": new_cush,
            "old_resp": old_specs.get("responsiveness"),
            "new_resp": new_resp,
            "old_stab": old_specs.get("stability"),
            "new_stab": new_stab,
            "old_dur": old_specs.get("durability"),
            "new_dur": new_dur,
        })

    mode_label = "적용 모드" if args.apply else "Dry-run"
    date_info = describe_date_range(args.date)
    print(f"\n=== RunRepeat 계측치 기반 정규화 ({len(preview_rows)}개 신발) [{mode_label}] [{date_info}] ===\n")
    if not preview_rows:
        print("Case B 신발 없음.")
        return

    print(
        f"{'shoeId':<42} {'brand':<12}"
        f" {'cushioning':>12} {'responsive':>12} {'stability':>12} {'durability':>12}"
    )
    print("-" * 110)
    for r in preview_rows:
        print(
            f"{r['shoeId']:<42} {r['brand']:<12}"
            f" {fmt_change(r['old_cush'], r['new_cush'])}"
            f" {fmt_change(r['old_resp'], r['new_resp'])}"
            f" {fmt_change(r['old_stab'], r['new_stab'])}"
            f" {fmt_change(r['old_dur'], r['new_dur'])}"
        )

    changed_count = sum(
        1 for r in preview_rows
        if r["old_cush"] != r["new_cush"]
        or r["old_resp"] != r["new_resp"]
        or r["old_stab"] != r["new_stab"]
        or r["old_dur"] != r["new_dur"]
    )
    print(f"\n변경 있는 신발: {changed_count}/{len(preview_rows)}개")

    if not args.apply:
        print("\n▶ --apply 플래그 추가 시 data/brands/*.json에 실제 적용됩니다.")
        return

    # Apply updates
    print("\n[적용 중...]")
    updated_files = 0
    updated_shoes = 0
    updated_research = 0

    for fname in sorted(BRANDS_DIR.iterdir()):
        if fname.suffix != ".json":
            continue
        with open(fname) as f:
            data = json.load(f)

        brand_id = data["brand"]["id"]
        if brand_id not in updates_by_brand:
            continue

        update_map = {u["shoeId"]: u for u in updates_by_brand[brand_id]}
        file_changed = False

        for shoe in data["shoes"]:
            sid = shoe["id"]
            if sid not in update_map:
                continue
            u = update_map[sid]
            specs = shoe["specs"]
            shoe_changed = False

            for field in ["cushioning", "responsiveness", "stability", "durability",
                          "rawCushioning", "rawResponsiveness", "rawStability", "rawDurability",
                          "stabilityComponents", "durabilityComponents"]:
                new_val = u[field]
                if new_val is None:
                    continue
                old_val = specs.get(field)
                if old_val != new_val:
                    specs[field] = new_val
                    print(f"  {fname.name}/{sid}: {field} {old_val} → {new_val}")
                    shoe_changed = True
                    file_changed = True

            if shoe_changed:
                updated_shoes += 1

        if file_changed:
            with open(fname, "w") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write("\n")
            updated_files += 1

    for shoe_id, payload in research_updates.items():
        with open(payload["fpath"]) as f:
            research = json.load(f)
        research["derivedSignals"] = payload["derivedSignals"]
        proposed = research.get("proposedScores", {})
        for field, value in payload["proposedScores"].items():
            if value is not None:
                proposed[field] = value
        research["proposedScores"] = proposed
        research["specsDecision"] = payload["specsDecision"]
        with open(payload["fpath"], "w") as f:
            json.dump(research, f, indent=2, ensure_ascii=False)
            f.write("\n")
        updated_research += 1

    print(f"\n완료: {updated_shoes}개 신발 업데이트, {updated_files}개 브랜드 파일 수정, research {updated_research}개 갱신")


if __name__ == "__main__":
    main()
