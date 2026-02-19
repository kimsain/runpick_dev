#!/usr/bin/env python3
"""
verify_all_specs.py
모든 브랜드 JSON 파일에서 4개 스펙 필드를 검증합니다.
- cushioning, stability, responsiveness, durability
- null/누락 여부, 1-10 범위 검사, 요약 통계
"""

import json
import glob
import os
from pathlib import Path

SPEC_FIELDS = ["cushioning", "stability", "responsiveness", "durability"]
BRANDS_DIR = Path(__file__).parent.parent / "data" / "brands"


def load_all_shoes():
    shoes = []
    for filepath in sorted(BRANDS_DIR.glob("*.json")):
        with open(filepath) as f:
            data = json.load(f)
        brand_id = data["brand"]["id"]
        for shoe in data["shoes"]:
            specs = shoe.get("specs", {})
            row = {
                "shoeId": shoe["id"],
                "brand": brand_id,
                "subcategoryId": shoe.get("subcategoryId", "-"),
            }
            for field in SPEC_FIELDS:
                row[field] = specs.get(field)
            shoes.append(row)
    return shoes


def check_issues(shoes):
    issues = []
    for shoe in shoes:
        for field in SPEC_FIELDS:
            val = shoe[field]
            if val is None:
                issues.append((shoe["shoeId"], shoe["brand"], field, "NULL/누락"))
            elif not isinstance(val, (int, float)) or val < 1 or val > 10:
                issues.append((shoe["shoeId"], shoe["brand"], field, f"범위 초과: {val}"))
    return issues


def print_table(shoes):
    header = f"{'shoeId':<40} {'brand':<14} {'subcat':<10} {'cush':>5} {'stab':>5} {'resp':>5} {'dura':>5}"
    print(header)
    print("-" * len(header))
    for s in shoes:
        def fmt(v):
            return f"{v:>5}" if v is not None else "  ---"
        row = (
            f"{s['shoeId']:<40} {s['brand']:<14} {s['subcategoryId']:<10}"
            f" {fmt(s['cushioning'])} {fmt(s['stability'])}"
            f" {fmt(s['responsiveness'])} {fmt(s['durability'])}"
        )
        print(row)


def print_summary(shoes):
    print("\n=== 요약 통계 ===")
    print(f"{'필드':<16} {'min':>5} {'max':>5} {'avg':>6} {'null':>6}")
    print("-" * 40)
    for field in SPEC_FIELDS:
        vals = [s[field] for s in shoes if s[field] is not None]
        null_count = sum(1 for s in shoes if s[field] is None)
        if vals:
            print(f"{field:<16} {min(vals):>5} {max(vals):>5} {sum(vals)/len(vals):>6.2f} {null_count:>6}")
        else:
            print(f"{field:<16} {'---':>5} {'---':>5} {'---':>6} {null_count:>6}")


def main():
    shoes = load_all_shoes()
    total = len(shoes)

    print(f"\n=== RunPick Specs 전체 검증 ({total}개 신발) ===\n")
    print_table(shoes)

    issues = check_issues(shoes)

    print(f"\n=== 이상값 ({len(issues)}건) ===")
    if issues:
        print(f"{'shoeId':<40} {'brand':<14} {'field':<16} 문제")
        print("-" * 80)
        for shoe_id, brand, field, problem in issues:
            print(f"{shoe_id:<40} {brand:<14} {field:<16} {problem}")
    else:
        print("이상값 없음. 모든 필드 정상.")

    print_summary(shoes)

    print(f"\n총 {total}개 신발, 이상값 {len(issues)}건")


if __name__ == "__main__":
    main()
