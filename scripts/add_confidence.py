import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECKPOINT_PATH = os.path.join(BASE_DIR, "research", "2026-02-18", "checkpoint.json")
BRANDS_DIR = os.path.join(BASE_DIR, "data", "brands")

with open(CHECKPOINT_PATH, "r") as f:
    checkpoint = json.load(f)

completed = checkpoint.get("completed", {})

# Build lookup: "brandId/slug" -> confidence
confidence_map = {}
for key, val in completed.items():
    confidence_map[key] = val.get("confidence", "low")

updated_count = 0

for filename in sorted(os.listdir(BRANDS_DIR)):
    if not filename.endswith(".json"):
        continue

    filepath = os.path.join(BRANDS_DIR, filename)
    with open(filepath, "r") as f:
        data = json.load(f)

    for shoe in data.get("shoes", []):
        brand_id = shoe.get("brandId", "")
        slug = shoe.get("slug", "")
        key = f"{brand_id}/{slug}"
        conf = confidence_map.get(key, "low")
        shoe["confidence"] = conf
        updated_count += 1

    with open(filepath, "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

print(f"Updated {updated_count} shoes across brand files")
