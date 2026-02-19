#!/usr/bin/env python3
"""
Compute final stability scores from torsionalRigidity and heelCounterStiffness.

Reads:  scripts/stability_data.json
Reads:  data/brands/*.json (to identify stability subcategory shoes)
Writes: scripts/stability_scores.json
"""
import json
import os

SCRIPTS_DIR = os.path.dirname(__file__)
STABILITY_DATA_FILE = os.path.join(SCRIPTS_DIR, "stability_data.json")
BRANDS_DIR = os.path.join(SCRIPTS_DIR, "../data/brands")
OUTPUT_FILE = os.path.join(SCRIPTS_DIR, "stability_scores.json")


def normalize(val):
    """Convert 1-5 scale to 1-10 scale."""
    return round(1 + (val - 1) / (5 - 1) * 9)


def get_stability_shoe_ids():
    """Extract all shoe IDs with subcategoryId='stability' from brand files."""
    stability_ids = set()
    for fname in os.listdir(BRANDS_DIR):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(BRANDS_DIR, fname)
        with open(fpath) as f:
            data = json.load(f)
        for shoe in data.get("shoes", []):
            if shoe.get("subcategoryId") == "stability":
                stability_ids.add(shoe["id"])
    return stability_ids


def main():
    with open(STABILITY_DATA_FILE) as f:
        stability_data = json.load(f)

    stability_shoe_ids = get_stability_shoe_ids()
    print(f"Stability subcategory shoes: {sorted(stability_shoe_ids)}\n")

    scores = {}
    for shoe_id, values in sorted(stability_data.items()):
        tor = values["torsionalRigidity"]
        hcs = values["heelCounterStiffness"]
        score_tor = normalize(tor)
        score_hcs = normalize(hcs)
        raw_score = round(score_tor * 0.4 + score_hcs * 0.6)

        is_stability = shoe_id in stability_shoe_ids
        final_score = max(raw_score, 6) if is_stability else raw_score

        scores[shoe_id] = final_score

        note = ""
        if is_stability and raw_score < 6:
            note = f"  ← stability floor applied (raw={raw_score})"
        elif is_stability:
            note = "  [stability]"
        print(f"  {shoe_id}: tor={tor} hcs={hcs} → score_tor={score_tor} score_hcs={score_hcs} raw={raw_score} final={final_score}{note}")

    with open(OUTPUT_FILE, "w") as f:
        json.dump(scores, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nWritten {len(scores)} scores to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
