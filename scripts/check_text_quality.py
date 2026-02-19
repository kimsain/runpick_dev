#!/usr/bin/env python3
"""텍스트 품질 검사 스크립트.

사용법:
  python3 scripts/check_text_quality.py          # 전체 브랜드 검사
  python3 scripts/check_text_quality.py nike      # 특정 브랜드만
"""
import json, re, sys
from pathlib import Path

BRANDS_DIR = Path("data/brands")

DESC_MIN, DESC_WARN_MIN = 180, 170
DESC_MAX, DESC_WARN_MAX = 260, 280
SHORT_DESC_MIN, SHORT_DESC_MAX = 35, 80

def strip_punct(s):
    return s.strip().rstrip('.。')

# 단독 명사구 판별: 조사가 하나도 없으면서 15자 이하
def is_bare_noun(s):
    particles = re.search(r'[이가을를에서으로와과은는도까지만보다]', s)
    return not particles and len(s) <= 15

def check_brand(path):
    data = json.loads(path.read_text())
    brand = path.stem
    issues = []
    for shoe in data.get("shoes", []):
        slug = shoe.get("slug", "?")
        # pros/cons: 단독 명사 종결 탐지
        for field in ("pros", "cons"):
            for i, item in enumerate(shoe.get(field, [])):
                cleaned = strip_punct(item)
                bare_endings = re.search(r'(부족$|없음$|불가$|아쉬움$|적음$|많음$)', cleaned)
                if bare_endings or is_bare_noun(cleaned):
                    issues.append(f"  [{field}][{i}] {slug}: {item}")
        # description 길이
        desc = shoe.get("description", "")
        ln = len(desc)
        if ln < DESC_WARN_MIN or ln > DESC_WARN_MAX:
            tag = "짧음" if ln < DESC_WARN_MIN else "김"
            issues.append(f"  [description] {slug}: {ln}자 ({tag})")
        elif ln < DESC_MIN or ln > DESC_MAX:
            tag = "짧음(경고)" if ln < DESC_MIN else "김(경고)"
            issues.append(f"  [description] {slug}: {ln}자 ({tag})")
        # shortDescription 길이
        sd = shoe.get("shortDescription", "")
        if sd:
            sln = len(sd)
            if sln < SHORT_DESC_MIN or sln > SHORT_DESC_MAX:
                issues.append(f"  [shortDescription] {slug}: {sln}자")
        # bestFor
        for item in shoe.get("bestFor", []):
            if not item.endswith("러너"):
                issues.append(f"  [bestFor] {slug}: '{item}'")
    return brand, issues

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else None
    paths = sorted(BRANDS_DIR.glob("*.json"))
    if target:
        paths = [p for p in paths if p.stem == target]
    total = 0
    for p in paths:
        brand, issues = check_brand(p)
        if issues:
            print(f"\n=== {brand} ({len(issues)} issues) ===")
            for line in issues:
                print(line)
            total += len(issues)
    print(f"\n총 {total}개 항목 발견")

if __name__ == "__main__":
    main()
