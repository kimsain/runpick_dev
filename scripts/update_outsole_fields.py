#!/usr/bin/env python3
"""
Update research JSON files with separated outsoleDurability and outsoleThickness fields.
Reads scraped data from scripts/outsole_data.json.
"""
import json
import os

RESEARCH_DIR = os.path.join(os.path.dirname(__file__), "../research/2026-02-18")
SCRAPED_FILE = os.path.join(os.path.dirname(__file__), "outsole_data.json")


def main():
    with open(SCRAPED_FILE) as f:
        scraped = json.load(f)

    updated = 0
    skipped = 0

    for brand in sorted(os.listdir(RESEARCH_DIR)):
        brand_dir = os.path.join(RESEARCH_DIR, brand)
        if not os.path.isdir(brand_dir):
            continue
        for fname in sorted(os.listdir(brand_dir)):
            if fname in ("batch-summary.json",) or not fname.endswith(".json"):
                continue
            fpath = os.path.join(brand_dir, fname)
            with open(fpath) as f:
                data = json.load(f)

            shoe_id = data["shoeId"]
            if shoe_id not in scraped:
                continue

            values = scraped[shoe_id]
            if values.get("error"):
                print(f"SKIP {shoe_id}: has error")
                skipped += 1
                continue

            changed = False
            for src in data.get("sources", []):
                if src.get("source") != "RunRepeat":
                    continue
                dur = src.get("attributeScores", {}).get("durability", {})

                new_dur_val = f"{values['outsoleDurability']} mm" if values["outsoleDurability"] is not None else None
                new_thick_val = f"{values['outsoleThickness']} mm" if values["outsoleThickness"] is not None else None

                old_dur = dur.get("outsoleDurability")
                old_thick = dur.get("outsoleThickness")

                dur["outsoleDurability"] = new_dur_val
                dur["outsoleThickness"] = new_thick_val
                dur["scale"] = "mm"

                if old_dur != new_dur_val or old_thick != new_thick_val:
                    changed = True
                    print(f"  {brand}/{shoe_id}: dur {old_dur!r} -> {new_dur_val!r}, thick {old_thick!r} -> {new_thick_val!r}")

            if changed:
                with open(fpath, "w") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                updated += 1

    print(f"\nUpdated: {updated} files")
    print(f"Skipped: {skipped} files")


if __name__ == "__main__":
    main()
