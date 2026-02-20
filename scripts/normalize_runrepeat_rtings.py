#!/usr/bin/env python3
"""
normalize_runrepeat_rtings.py  — Case B 정규화

RunRepeat + RTINGS 둘 다 있는 신발의 스코어를 RunRepeat 계측치 기반으로 정규화.

정규화 공식:
  cushioning    = clamp(round((raw-50)/(200-50)*10), 1, 10)
                  where raw = heelSA * 0.6 + forefootSA * 0.4
  responsiveness = clamp(round((avg_ER - 30) / (82 - 30) * 10), 1, 10)
  stability     = existing + delta (keywords: +1 positive, -1 negative)
  durability    = existing + delta (keywords: +1 positive, -1 negative)

사용법:
  python3 scripts/normalize_runrepeat_rtings.py --dry-run   # preview
  python3 scripts/normalize_runrepeat_rtings.py --apply      # 실제 업데이트
"""

import argparse
import json
import re
from pathlib import Path

RESEARCH_DIR = Path(__file__).parent.parent / "research" / "2026-02-18"
BRANDS_DIR = Path(__file__).parent.parent / "data" / "brands"

STABILITY_POS_RE = re.compile(r"\b(stable|stiff|firm|supportive|stability)\b", re.IGNORECASE)
STABILITY_NEG_RE = re.compile(r"\b(unstable|wobbly|sloppy)\b", re.IGNORECASE)
DURABILITY_POS_RE = re.compile(r"\b(durable|long-lasting|holds up|outsole)\b", re.IGNORECASE)
DURABILITY_NEG_RE = re.compile(r"\b(wears fast|breaks down|poor durability|worn out)\b", re.IGNORECASE)


def clamp(val, lo, hi):
    return max(lo, min(hi, val))


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


def keyword_delta(text, pos_re, neg_re):
    """Return +1 if positive keywords found, -1 if negative, 0 otherwise."""
    has_pos = bool(pos_re.search(text))
    has_neg = bool(neg_re.search(text))
    if has_pos and not has_neg:
        return 1
    elif has_neg and not has_pos:
        return -1
    return 0


def compute_scores(rr_src, existing_specs, findings_text):
    """
    RunRepeat 계측치 기반으로 cushioning, responsiveness 계산.
    stability, durability는 기존값 + 키워드 delta.
    """
    rr_cush = rr_src["attributeScores"]["cushioning"]
    rr_resp = rr_src["attributeScores"]["responsiveness"]

    # cushioning from RunRepeat SA values
    heel_sa = rr_cush.get("heelShockAbsorption")
    fore_sa = rr_cush.get("forefootShockAbsorption")
    cushioning = None
    if heel_sa is not None and fore_sa is not None:
        raw = heel_sa * 0.6 + fore_sa * 0.4
        cushioning = clamp(round((raw - 50) / (200 - 50) * 10), 1, 10)

    # responsiveness from RunRepeat ER%
    heel_er = rr_resp.get("heelEnergyReturn")
    fore_er = rr_resp.get("forefootEnergyReturn")
    responsiveness = None
    if heel_er is not None and fore_er is not None:
        avg_er = (heel_er + fore_er) / 2
        responsiveness = clamp(round((avg_er - 30) / (82 - 30) * 10), 1, 10)

    # stability: existing + keyword delta
    old_stab = existing_specs.get("stability", 6)
    stab_delta = keyword_delta(findings_text, STABILITY_POS_RE, STABILITY_NEG_RE)
    stability = clamp(old_stab + stab_delta, 1, 10)

    # durability: existing + keyword delta
    old_dur = existing_specs.get("durability", 5)
    dur_delta = keyword_delta(findings_text, DURABILITY_POS_RE, DURABILITY_NEG_RE)
    durability = clamp(old_dur + dur_delta, 1, 10)

    return cushioning, responsiveness, stability, durability


def fmt_change(old, new, width=12):
    if new is None:
        return f"{'N/A':>{width}}"
    if old == new:
        return f"{new:>{width}}"
    arrow = f"{old}→{new}"
    return f"{arrow:>{width}}"


def main():
    parser = argparse.ArgumentParser(description="Case B RunRepeat+RTINGS 정규화")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="Preview only")
    group.add_argument("--apply", action="store_true", help="Apply to brand JSON files")
    args = parser.parse_args()

    production = load_production()

    updates_by_brand: dict = {}
    preview_rows = []

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

            # Case B: RunRepeat found AND RTINGS found
            if rr_status != "found" or rt_status != "found":
                continue

            rr_src = get_source(research.get("sources", []), "RunRepeat")
            if rr_src is None:
                continue

            prod = production[shoe_id]
            old_specs = prod["specs"]
            findings_text = get_qualitative_findings(research.get("sources", []))

            new_cush, new_resp, new_stab, new_dur = compute_scores(
                rr_src, old_specs, findings_text
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
            })

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
    print(f"\n=== Case B RunRepeat+RTINGS 정규화 ({len(preview_rows)}개 신발) [{mode_label}] ===\n")
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

            for field in ["cushioning", "responsiveness", "stability", "durability"]:
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

    print(f"\n완료: {updated_shoes}개 신발 업데이트, {updated_files}개 브랜드 파일 수정")


if __name__ == "__main__":
    main()
