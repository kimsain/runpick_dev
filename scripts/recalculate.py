#!/usr/bin/env python3
"""
recalculate.py — weightScore + valueScore 통합 재계산

새 신발 추가 후 이 스크립트 하나만 실행하면 파생 점수 갱신 완료.

사용법:
  python3 scripts/recalculate.py                    # dry-run: 전부
  python3 scripts/recalculate.py --apply             # 적용
  python3 scripts/recalculate.py --only weight       # weightScore만
  python3 scripts/recalculate.py --only value        # valueScore만
"""

import argparse
import json
from pathlib import Path

from formulas import clamp, weight_score, value_score

BRANDS_DIR = Path(__file__).parent.parent / "data" / "brands"


def main():
    parser = argparse.ArgumentParser(description="weightScore + valueScore 통합 재계산")
    parser.add_argument("--apply", action="store_true", help="실제로 JSON 업데이트")
    parser.add_argument("--only", choices=["weight", "value"], help="특정 점수만 계산")
    args = parser.parse_args()

    do_weight = args.only is None or args.only == "weight"
    do_value = args.only is None or args.only == "value"

    rows = []

    for fpath in sorted(BRANDS_DIR.glob("*.json")):
        with open(fpath) as f:
            data = json.load(f)

        file_changed = False
        for shoe in data["shoes"]:
            specs = shoe.get("specs", {})
            price = shoe.get("price")
            row = {"shoeId": shoe["id"]}

            # weightScore
            if do_weight:
                w = specs.get("weight")
                if w is not None:
                    old_ws = specs.get("weightScore")
                    new_ws = weight_score(float(w))
                    row["weight"] = w
                    row["old_ws"] = old_ws
                    row["new_ws"] = new_ws
                    if args.apply and old_ws != new_ws:
                        specs["weightScore"] = new_ws
                        file_changed = True

            # valueScore
            if do_value:
                cush = specs.get("cushioning")
                resp = specs.get("responsiveness")
                stab = specs.get("stability")
                dur = specs.get("durability")
                if price and all(v is not None for v in [cush, resp, stab, dur]):
                    old_vs = specs.get("valueScore")
                    new_vs = value_score(cush, resp, stab, dur, price)
                    row["price"] = price
                    row["old_vs"] = old_vs
                    row["new_vs"] = new_vs
                    if args.apply and old_vs != new_vs:
                        specs["valueScore"] = new_vs
                        file_changed = True

            if len(row) > 1:  # has at least one score
                rows.append(row)

        if args.apply and file_changed:
            with open(fpath, "w") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write("\n")

    # 출력
    mode_label = "적용 모드" if args.apply else "Dry-run"
    scope = args.only or "weight+value"
    print(f"\n=== recalculate [{scope}] ({len(rows)}개 신발) [{mode_label}] ===\n")

    has_weight = do_weight and any("new_ws" in r for r in rows)
    has_value = do_value and any("new_vs" in r for r in rows)

    # 헤더
    header = f"{'shoeId':<42}"
    if has_weight:
        header += f" {'weight':>7} {'ws_old':>6} {'ws_new':>6}"
    if has_value:
        header += f" {'price':>8} {'vs_old':>6} {'vs_new':>6}"
    print(header)
    print("-" * len(header))

    changed = 0
    for r in rows:
        line = f"{r['shoeId']:<42}"
        ws_changed = r.get("old_ws") != r.get("new_ws") and "new_ws" in r
        vs_changed = r.get("old_vs") != r.get("new_vs") and "new_vs" in r

        if has_weight:
            if "new_ws" in r:
                line += f" {str(r['weight']):>7}g {str(r['old_ws']):>6} {r['new_ws']:>6}"
            else:
                line += f" {'':>7}  {'':>6} {'':>6}"
        if has_value:
            if "new_vs" in r:
                line += f" {str(r['price']):>8} {str(r['old_vs']):>6} {r['new_vs']:>6}"
            else:
                line += f" {'':>8} {'':>6} {'':>6}"

        marker = " ←" if ws_changed or vs_changed else ""
        print(line + marker)
        if ws_changed or vs_changed:
            changed += 1

    print(f"\n변경: {changed}개")
    if not args.apply:
        print("▶ --apply 플래그 추가 시 실제 적용됩니다.")


if __name__ == "__main__":
    main()
