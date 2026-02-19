#!/usr/bin/env python3
"""
Update research JSON files with torsionalRigidity and heelCounterStiffness fields.
Reads scraped data from scripts/stability_data.json.
"""
import json
import os

RESEARCH_DIR = os.path.join(os.path.dirname(__file__), "../research/2026-02-18")
SCRAPED_FILE = os.path.join(os.path.dirname(__file__), "stability_data.json")


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
                stab = src.get("attributeScores", {}).get("stability", {})

                new_tor = values["torsionalRigidity"]
                new_hcs = values["heelCounterStiffness"]

                old_tor = stab.get("torsionalRigidity")
                old_hcs = stab.get("heelCounterStiffness")

                stab["torsionalRigidity"] = new_tor
                stab["heelCounterStiffness"] = new_hcs
                stab["scale"] = "/5"

                if old_tor != new_tor or old_hcs != new_hcs:
                    changed = True
                    print(f"  {brand}/{shoe_id}: tor {old_tor!r} -> {new_tor!r}, hcs {old_hcs!r} -> {new_hcs!r}")

            if changed:
                with open(fpath, "w") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                updated += 1

    print(f"\nUpdated: {updated} files")
    print(f"Skipped: {skipped} files")


if __name__ == "__main__":
    main()
