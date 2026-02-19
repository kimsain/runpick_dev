#!/usr/bin/env python3
"""
Scrape RunRepeat pages for stability lab values (torsional rigidity, heel counter stiffness).
Saves results to scripts/stability_data.json.
"""
import json
import os
import re
import time
import urllib.request

RESEARCH_DIR = os.path.join(os.path.dirname(__file__), "../research/2026-02-18")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "stability_data.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

TOR_PATTERN = re.compile(
    r'Torsional rigidity\s*<span[^>]*></span>\s*</th>\s*<td>([\d.]+)\s*</td>'
)
HCS_PATTERN = re.compile(
    r'Heel counter stiffness\s*<span[^>]*></span>\s*</th>\s*<td>([\d.]+)\s*</td>'
)


def collect_urls():
    """Collect all RunRepeat URLs from research JSON files."""
    entries = []
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
            for src in data.get("sources", []):
                if src.get("source") == "RunRepeat" and src.get("url"):
                    entries.append({
                        "brand": brand,
                        "shoeId": data["shoeId"],
                        "url": src["url"],
                    })
    return entries


def fetch_and_parse(url):
    """Fetch RunRepeat page and extract stability values."""
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read().decode("utf-8", errors="replace")

    tor_match = TOR_PATTERN.search(html)
    hcs_match = HCS_PATTERN.search(html)

    return {
        "torsionalRigidity": float(tor_match.group(1)) if tor_match else None,
        "heelCounterStiffness": float(hcs_match.group(1)) if hcs_match else None,
    }


def main():
    # Load existing results if any (for resume support)
    results = {}
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE) as f:
            results = json.load(f)
        print(f"Loaded {len(results)} existing results from {OUTPUT_FILE}")

    entries = collect_urls()
    print(f"Total RunRepeat entries: {len(entries)}")

    for i, entry in enumerate(entries):
        key = entry["shoeId"]
        if key in results:
            print(f"[{i+1}/{len(entries)}] SKIP {key} (already scraped)")
            continue

        print(f"[{i+1}/{len(entries)}] Fetching {entry['brand']}/{key} ...")
        try:
            values = fetch_and_parse(entry["url"])
            results[key] = {
                "brand": entry["brand"],
                "url": entry["url"],
                **values,
            }
            print(f"  -> torsionalRigidity={values['torsionalRigidity']}, heelCounterStiffness={values['heelCounterStiffness']}")
        except Exception as e:
            print(f"  -> ERROR: {e}")
            results[key] = {
                "brand": entry["brand"],
                "url": entry["url"],
                "torsionalRigidity": None,
                "heelCounterStiffness": None,
                "error": str(e),
            }

        # Save after each entry for resume support
        with open(OUTPUT_FILE, "w") as f:
            json.dump(results, f, indent=2)

        # Polite delay between requests
        if i < len(entries) - 1:
            time.sleep(1.0)

    print(f"\nDone. Results saved to {OUTPUT_FILE}")
    print(f"Total: {len(results)} entries")
    missing_tor = sum(1 for v in results.values() if v.get("torsionalRigidity") is None)
    missing_hcs = sum(1 for v in results.values() if v.get("heelCounterStiffness") is None)
    print(f"Missing torsionalRigidity: {missing_tor}")
    print(f"Missing heelCounterStiffness: {missing_hcs}")


if __name__ == "__main__":
    main()
