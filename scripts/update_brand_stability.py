#!/usr/bin/env python3
"""
Update specs.stability in data/brands/*.json using computed scores.

Reads:  scripts/stability_scores.json
Writes: data/brands/*.json (69 shoes with RunRepeat data)
"""
import json
import os

SCRIPTS_DIR = os.path.dirname(__file__)
SCORES_FILE = os.path.join(SCRIPTS_DIR, "stability_scores.json")
BRANDS_DIR = os.path.join(SCRIPTS_DIR, "../data/brands")


def main():
    with open(SCORES_FILE) as f:
        scores = json.load(f)

    updated_files = 0
    updated_shoes = 0
    skipped = 0

    for fname in sorted(os.listdir(BRANDS_DIR)):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(BRANDS_DIR, fname)
        with open(fpath) as f:
            data = json.load(f)

        changed = False
        for shoe in data.get("shoes", []):
            shoe_id = shoe["id"]
            if shoe_id not in scores:
                skipped += 1
                continue

            new_score = scores[shoe_id]
            old_score = shoe.get("specs", {}).get("stability")

            if old_score != new_score:
                shoe["specs"]["stability"] = new_score
                print(f"  {fname}/{shoe_id}: stability {old_score} → {new_score}")
                changed = True
                updated_shoes += 1

        if changed:
            with open(fpath, "w") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write("\n")
            updated_files += 1

    print(f"\nUpdated: {updated_shoes} shoes across {updated_files} brand files")
    print(f"Skipped (no RunRepeat data): {skipped} shoes")


if __name__ == "__main__":
    main()
