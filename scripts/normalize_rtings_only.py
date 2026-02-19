#!/usr/bin/env python3
"""
normalize_rtings_only.py  — Case A 정규화

RunRepeat 없음 + RTINGS 있음인 생산 신발의 스코어를 RTINGS 계측치 기반으로 정규화.

정규화 공식:
  cushioning    = round((heelShockAbsorption + forefootShockAbsorption) / 2)
  responsiveness = clamp(round(avg_energy_return_pct / 10), 1, 10)
                   subcategoryId == "max-cushion" 이면 -1 페널티
  stability     = 카테고리 휴리스틱:
                   "stability" subcat → 8, 그 외 → 6
                   keyFindings에 stable/stiff/firm/supportive 언급 시 +1
  durability    = 현재값 유지 (RTINGS 미측정)

사용법:
  python3 scripts/normalize_rtings_only.py           # dry-run (preview만)
  python3 scripts/normalize_rtings_only.py --apply   # data/brands/*.json 실제 업데이트
"""

import argparse
import json
import re
from pathlib import Path

RESEARCH_DIR = Path(__file__).parent.parent / "research" / "2026-02-18"
BRANDS_DIR = Path(__file__).parent.parent / "data" / "brands"

STABILITY_RE = re.compile(r"\b(stable|stiff|firm|supportive|stability)\b", re.IGNORECASE)

# 캘리브레이션 결과 기반 카테고리별 반응성 페널티
# (calibrate_rtings.py 실행 결과에서 도출)
# stability 평균 bias: +1.86, max-cushion 평균 bias: +1.1 (with -1 적용 후)
# daily 카테고리 평균 bias: +1~+2, racing 카테고리는 bias ≈ 0
RESP_PENALTY_BY_SUBCAT: dict = {
    "stability":   -2,  # avg bias +1.86 → -2로 보정
    "max-cushion": -2,  # avg bias +1.1 (with -1) → 총 -2로 증가
    "all-rounder": -1,  # avg bias +1.8
    "entry":       -1,  # avg bias +2
    "lightweight": -1,  # avg bias +1
    "no-plate":    -1,  # avg bias +0.7~1
    "light-plate": -1,  # avg bias +0.4~1
    # "full":        0  # racing plate, avg bias ≈ 0
    # "half":        0  # half plate, already underestimates
    # "carbon-plate": 0
}


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
    """RTINGS 제외 소스들의 keyFindings 텍스트 합산 (stability 키워드 탐지용)."""
    findings = []
    for src in sources:
        if src["source"] != "RTINGS":
            findings.extend(src.get("keyFindings", []))
    return " ".join(findings)


def compute_scores(rtings_src, subcategoryId, findings_text):
    """
    RTINGS 계측치 + 카테고리 휴리스틱으로 3개 스코어 계산.
    Returns (cushioning, responsiveness, stability) — None if data missing.
    """
    cush = rtings_src["attributeScores"]["cushioning"]
    resp = rtings_src["attributeScores"]["responsiveness"]

    # cushioning
    heel_cush = cush.get("heelShockAbsorption")
    fore_cush = cush.get("forefootShockAbsorption")
    cushioning = None
    if heel_cush is not None and fore_cush is not None:
        cushioning = round((heel_cush + fore_cush) / 2)

    # responsiveness — 카테고리별 페널티 적용 (calibrate_rtings.py 기반)
    heel_er = resp.get("heelEnergyReturn")
    fore_er = resp.get("forefootEnergyReturn")
    responsiveness = None
    if heel_er is not None and fore_er is not None:
        avg_er = (heel_er + fore_er) / 2
        responsiveness = clamp(round(avg_er / 10), 1, 10)
        penalty = RESP_PENALTY_BY_SUBCAT.get(subcategoryId, 0)
        if penalty != 0:
            responsiveness = clamp(responsiveness + penalty, 1, 10)

    # stability — RTINGS 미측정, 카테고리 휴리스틱
    if subcategoryId == "stability":
        stability = 8
    else:
        stability = 6
    if STABILITY_RE.search(findings_text):
        stability = clamp(stability + 1, 1, 10)

    return cushioning, responsiveness, stability


def fmt_change(old, new, width=12):
    """변경 없으면 그냥 값, 변경 있으면 old→new 표시."""
    if new is None:
        return f"{'N/A':>{width}}"
    if old == new:
        return f"{new:>{width}}"
    arrow = f"{old}→{new}"
    return f"{arrow:>{width}}"


def main():
    parser = argparse.ArgumentParser(description="Case A RTINGS 정규화")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="실제로 data/brands/*.json 업데이트 (없으면 dry-run)",
    )
    args = parser.parse_args()

    production = load_production()

    # {brand_id: [{shoeId, cushioning, responsiveness, stability}]}
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
                continue  # 생산에 없는 신발 스킵

            attempt_log = research.get("attemptLog", [])
            rr_status = get_attempt_status(attempt_log, "RunRepeat")
            rt_status = get_attempt_status(attempt_log, "RTINGS")

            # Case A: RunRepeat 없음 + RTINGS 있음
            if rr_status == "found" or rt_status != "found":
                continue

            rtings_src = get_source(research.get("sources", []), "RTINGS")
            if rtings_src is None:
                continue

            prod = production[shoe_id]
            subcatId = prod["subcategoryId"]
            old_specs = prod["specs"]
            findings_text = get_qualitative_findings(research.get("sources", []))

            new_cush, new_resp, new_stab = compute_scores(rtings_src, subcatId, findings_text)

            brand_id = prod["brand"]
            if brand_id not in updates_by_brand:
                updates_by_brand[brand_id] = []
            updates_by_brand[brand_id].append({
                "shoeId": shoe_id,
                "cushioning": new_cush,
                "responsiveness": new_resp,
                "stability": new_stab,
            })

            preview_rows.append({
                "shoeId": shoe_id,
                "brand": brand_id,
                "subcatId": subcatId,
                "old_cush": old_specs.get("cushioning"),
                "new_cush": new_cush,
                "old_resp": old_specs.get("responsiveness"),
                "new_resp": new_resp,
                "old_stab": old_specs.get("stability"),
                "new_stab": new_stab,
            })

    # 미리보기 출력
    mode_label = "적용 모드" if args.apply else "Dry-run (--apply 없으면 변경 없음)"
    print(f"\n=== Case A RTINGS 정규화 ({len(preview_rows)}개 신발) [{mode_label}] ===\n")
    if not preview_rows:
        print("Case A 신발 없음 (RunRepeat 없음 + RTINGS 있음 + 생산 포함).")
        return

    print(
        f"{'shoeId':<42} {'brand':<12} {'subcat':<14}"
        f" {'cushioning':>12} {'responsive':>12} {'stability':>12}"
    )
    print("-" * 110)
    for r in preview_rows:
        print(
            f"{r['shoeId']:<42} {r['brand']:<12} {r['subcatId']:<14}"
            f" {fmt_change(r['old_cush'], r['new_cush'])}"
            f" {fmt_change(r['old_resp'], r['new_resp'])}"
            f" {fmt_change(r['old_stab'], r['new_stab'])}"
        )

    changed_count = sum(
        1 for r in preview_rows
        if r["old_cush"] != r["new_cush"]
        or r["old_resp"] != r["new_resp"]
        or r["old_stab"] != r["new_stab"]
    )
    print(f"\n변경 있는 신발: {changed_count}/{len(preview_rows)}개")

    if not args.apply:
        print("\n▶ --apply 플래그 추가 시 data/brands/*.json에 실제 적용됩니다.")
        return

    # 실제 업데이트
    print("\n[적용 중...]")
    updated_files = 0
    updated_shoes = 0

    for fname in sorted((BRANDS_DIR).iterdir()):
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

            for field in ["cushioning", "responsiveness", "stability"]:
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
