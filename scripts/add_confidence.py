#!/usr/bin/env python3
"""Inject confidence level into data/brands/*.json based on checkpoint statuses."""

import json
import glob
import os

CHECKPOINT = "research/2026-02-18/checkpoint.json"
BRANDS_DIR = "data/brands"

MEASUREMENT_SOURCES = {"RunRepeat", "RTINGS"}
QUALITATIVE_SOURCES = {"Doctors of Running", "Road Trail Run", "Believe in the Run"}


def parse_statuses(statuses):
    """Parse statuses list into sets of found measurement and qualitative sources."""
    measurement_found = set()
    qualitative_found = set()
    for s in statuses:
        if ":" not in s:
            continue
        source, status = s.split(":", 1)
        source = source.strip()
        status = status.strip()
        if status in ("found", "partial"):
            if source in MEASUREMENT_SOURCES:
                measurement_found.add(source)
            elif source in QUALITATIVE_SOURCES:
                qualitative_found.add(source)
    return measurement_found, qualitative_found


def compute_confidence(measurement_found, qualitative_found):
    has_runrepeat = "RunRepeat" in measurement_found
    has_rtings = "RTINGS" in measurement_found
    q_count = len(qualitative_found)

    if has_runrepeat and has_rtings:
        return "very-high"
    elif (has_runrepeat or has_rtings) and q_count >= 1:
        return "high"
    elif not has_runrepeat and not has_rtings and q_count >= 2:
        return "medium"
    else:
        return "low"


def main():
    with open(CHECKPOINT) as f:
        checkpoint = json.load(f)
    completed = checkpoint.get("completed", {})

    # Build confidence map
    confidence_map = {}
    for key, val in completed.items():
        statuses = val.get("statuses", [])
        m_found, q_found = parse_statuses(statuses)
        confidence_map[key] = compute_confidence(m_found, q_found)

    # Inject into brand JSON files
    counts = {"very-high": 0, "high": 0, "medium": 0, "low": 0}
    brand_files = glob.glob(os.path.join(BRANDS_DIR, "*.json"))
    for brand_file in sorted(brand_files):
        with open(brand_file) as f:
            data = json.load(f)
        brand_id = data["brand"]["id"]
        changed = False
        for shoe in data.get("shoes", []):
            key = f"{brand_id}/{shoe['slug']}"
            confidence = confidence_map.get(key, "low")
            if shoe.get("confidence") != confidence:
                shoe["confidence"] = confidence
                changed = True
            counts[confidence] += 1
        if changed:
            with open(brand_file, "w") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"Updated: {brand_file}")

    print("\nConfidence distribution:")
    for level, count in counts.items():
        print(f"  {level}: {count}")


if __name__ == "__main__":
    main()
