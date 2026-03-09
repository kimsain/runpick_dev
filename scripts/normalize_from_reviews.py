#!/usr/bin/env python3
"""
normalize_from_reviews.py  — Case C 정규화

RunRepeat 없음 + RTINGS 없음인 생산 신발의 점수를
정성 리뷰 기반으로 제안한다.

쿠션/반응은 Claude API가 제안하고,
안정성/내구성은 structured signal rubric으로 계산한다.

사용법:
  python3 scripts/normalize_from_reviews.py           # dry-run (API 호출 없음)
  python3 scripts/normalize_from_reviews.py --apply   # Claude API 호출 + research JSON 업데이트
"""

import argparse
import json
import time
from pathlib import Path

from research_utils import resolve_research_files, describe_date_range
from stability_durability_v3 import derive_signals, compute_stability_v3, compute_durability_v3

BRANDS_DIR = Path(__file__).parent.parent / "data" / "brands"

CLAUDE_MODEL = "claude-haiku-4-5-20251001"

EXTRACT_PROMPT = """\
다음은 러닝화 리뷰에서 추출한 텍스트입니다.
2개 항목의 점수(1~10 정수)를 추론해서 JSON으로만 반환하세요.

항목:
- cushioning (쿠셔닝/충격흡수): 1=매우 딱딱, 10=매우 푹신
- responsiveness (반응성/반발력): 1=매우 둔함, 10=매우 탄력적

규칙:
- 언급 없으면 6 (중립)
- 다른 텍스트 없이 JSON만 반환 (예: {{"cushioning": 7, "responsiveness": 8}})

리뷰 텍스트:
{findings_text}
"""


def get_attempt_status(attempt_log, source_name):
    for entry in attempt_log:
        if entry["source"] == source_name:
            return entry["status"]
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


def collect_all_findings(sources):
    """모든 소스의 keyFindings를 합산."""
    findings = []
    for src in sources:
        findings.extend(src.get("keyFindings", []))
    return findings


def call_claude(findings_text: str) -> dict:
    """Claude API로 스코어 추출. anthropic 패키지 필요."""
    try:
        import anthropic
    except ImportError:
        raise RuntimeError(
            "anthropic 패키지가 설치되어 있지 않습니다.\n"
            "  pip install anthropic"
        )

    client = anthropic.Anthropic()
    prompt = EXTRACT_PROMPT.format(findings_text=findings_text)

    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = response.content[0].text.strip()

    # JSON 파싱
    try:
        scores = json.loads(raw)
    except json.JSONDecodeError:
        # 혹시 ```json ``` 블록으로 감싸진 경우 처리
        import re
        m = re.search(r"\{[^}]+\}", raw)
        if m:
            scores = json.loads(m.group())
        else:
            raise ValueError(f"JSON 파싱 실패: {raw!r}")

    # 값 검증 및 보정 (1-10 범위)
    for field in ["cushioning", "responsiveness"]:
        val = scores.get(field)
        if not isinstance(val, int) or val < 1 or val > 10:
            scores[field] = 6  # 기본값
    return scores


def llm_auth_available() -> bool:
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False
    try:
        import os
        return bool(os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN"))
    except Exception:
        return False


def fallback_cr_scores(current_scores: dict, prod_specs: dict) -> dict:
    def pick(field: str) -> int:
        value = prod_specs.get(field)
        if isinstance(value, int) and 1 <= value <= 10:
            return value
        value = current_scores.get(field)
        if isinstance(value, int) and 1 <= value <= 10:
            return value
        return 6

    return {
        "cushioning": pick("cushioning"),
        "responsiveness": pick("responsiveness"),
    }


def main():
    parser = argparse.ArgumentParser(description="Case C 정성 텍스트 정규화")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Claude API 호출 후 research JSON proposedScores 업데이트 (없으면 dry-run)",
    )
    parser.add_argument(
        "--sync-production",
        action="store_true",
        help="--apply와 함께 사용: proposedScores를 data/brands/*.json에도 반영",
    )
    parser.add_argument(
        "--allow-fallback",
        action="store_true",
        help="LLM 인증이 없거나 호출 실패 시 기존 c/r 또는 6을 사용해 stability/durability 동기화를 계속 진행",
    )
    parser.add_argument("--date", metavar="YYYY-MM-DD", help="리서치 날짜 (기본: 최신)")
    parser.add_argument("--shoe-id", metavar="ID", help="특정 신발만 처리")
    args = parser.parse_args()

    research_files = resolve_research_files(args.date)
    production = load_production()

    case_c_shoes = []

    for fpath in research_files:
        with open(fpath) as f:
            research = json.load(f)

        shoe_id = research["shoeId"]
        if args.shoe_id and shoe_id != args.shoe_id:
            continue
        if shoe_id not in production:
            continue

        attempt_log = research.get("attemptLog", [])
        rr_status = get_attempt_status(attempt_log, "RunRepeat")
        rt_status = get_attempt_status(attempt_log, "RTINGS")

        # Case C: RunRepeat 없음 + RTINGS 없음
        if rr_status in {"found", "found_via_shared_midsole"} or rt_status == "found":
            continue

        sources = research.get("sources", [])
        findings = collect_all_findings(sources)
        if not findings:
            continue  # 텍스트 데이터도 없으면 스킵

        prod = production[shoe_id]
        derived_signals = derive_signals(sources)
        stability, raw_stab, stab_components, derived_signals = compute_stability_v3(
            sources,
            prod["specs"],
            prod["subcategoryId"],
            derived=derived_signals,
        )
        durability, raw_dur, dur_components, derived_signals = compute_durability_v3(
            sources,
            prod["specs"],
            derived=derived_signals,
        )

        case_c_shoes.append({
            "shoeId": shoe_id,
            "brand": prod["brand"],
            "subcatId": prod["subcategoryId"],
            "fpath": fpath,
            "research": research,
            "findings": findings,
            "currentScores": research.get("currentScores", {}),
            "productionSpecs": prod["specs"],
            "stability": stability,
            "durability": durability,
            "rawStability": raw_stab,
            "rawDurability": raw_dur,
            "stabilityComponents": stab_components,
            "durabilityComponents": dur_components,
            "derivedSignals": derived_signals,
        })

    # 미리보기
    mode_label = "적용 모드 (Claude API 또는 fallback)" if args.apply else "Dry-run (--apply 없으면 API 호출 없음)"
    date_info = describe_date_range(args.date)
    print(f"\n=== Case C 정성 텍스트 정규화 ({len(case_c_shoes)}개 신발) [{mode_label}] [{date_info}] ===\n")

    if not case_c_shoes:
        print("Case C 신발 없음 (RunRepeat 없음 + RTINGS 없음 + 정성 소스 보유 + 생산 포함).")
        return

    print(f"{'shoeId':<42} {'brand':<12} {'subcat':<14} {'현재 c/s/r/d':<18} {'V3 stab/dur':<12}")
    print("-" * 110)
    for s in case_c_shoes:
        cs = s["currentScores"]
        scores_str = f"{cs.get('cushioning','-')}/{cs.get('stability','-')}/{cs.get('responsiveness','-')}/{cs.get('durability','-')}"
        v3_str = f"{s['stability']}/{s['durability']}"
        print(f"{s['shoeId']:<42} {s['brand']:<12} {s['subcatId']:<14} {scores_str:<18} {v3_str:<12}")
        print(f"  소스 ({len(s['findings'])}개 finding): {s['findings'][0][:80]}...")

    if not args.apply:
        print(f"\n▶ --apply 플래그 추가 시 Claude API 호출 또는 fallback으로 research JSON proposedScores 업데이트됩니다.")
        print(f"  모델: {CLAUDE_MODEL}")
        print(f"  예상 API 호출: {len(case_c_shoes)}회")
        print("  stability/durability는 이미 V3 structured rubric으로 계산됩니다.")
        return

    # Claude API 호출 + research JSON 업데이트
    llm_available = llm_auth_available()
    fallback_enabled = args.allow_fallback or not llm_available

    if llm_available:
        print(f"\n[Claude API 호출 중... 모델: {CLAUDE_MODEL}]")
    elif fallback_enabled:
        print("\n[Claude API 인증 없음: 기존 cushioning/responsiveness 유지 fallback으로 진행]")
    else:
        print("\n[Claude API 인증 없음]")
        print("▶ ANTHROPIC_API_KEY 또는 ANTHROPIC_AUTH_TOKEN 설정 후 다시 실행하거나 --allow-fallback을 사용하세요.")
        return

    updated = 0
    errors = 0
    updates_by_brand: dict[str, list[dict]] = {}

    for s in case_c_shoes:
        shoe_id = s["shoeId"]
        findings_text = "\n".join(f"- {f}" for f in s["findings"])

        print(f"\n  [{shoe_id}] ", end="", flush=True)
        llm_error = None
        llm_scores = None
        if llm_available:
            print("API 호출 중...", end="", flush=True)
            try:
                llm_scores = call_claude(findings_text)
            except Exception as e:
                llm_error = e

        if llm_scores is not None:
            proposed = {
                "cushioning": llm_scores["cushioning"],
                "responsiveness": llm_scores["responsiveness"],
                "stability": s["stability"],
                "durability": s["durability"],
            }
            decision_note = (
                f"Claude {CLAUDE_MODEL} 기반 cushioning/responsiveness 제안 + "
                "stability/durability structured rubric 계산."
            )
            print(f" → {proposed}")
        elif fallback_enabled:
            fallback_scores = fallback_cr_scores(s["currentScores"], s["productionSpecs"])
            proposed = {
                "cushioning": fallback_scores["cushioning"],
                "responsiveness": fallback_scores["responsiveness"],
                "stability": s["stability"],
                "durability": s["durability"],
            }
            reason = "Claude API 인증 없음" if llm_error is None else f"Claude API 오류: {llm_error}"
            decision_note = (
                f"{reason}. 기존 production/current score를 cushioning/responsiveness fallback으로 유지하고 "
                "stability/durability structured rubric 계산."
            )
            print(f"fallback 적용 → {proposed}")
        else:
            print(f"✗ 오류: {llm_error}")
            errors += 1
            continue

        # research JSON 업데이트
        research = s["research"]
        old_proposed = research.get("proposedScores", {})

        research["proposedScores"] = proposed
        research["derivedSignals"] = s["derivedSignals"]
        research["specsDecision"] = (
            f"[normalize_from_reviews.py] {decision_note} "
            f"이전 proposed: {old_proposed}."
        )

        with open(s["fpath"], "w") as f:
            json.dump(research, f, indent=2, ensure_ascii=False)
            f.write("\n")

        if args.sync_production:
            updates_by_brand.setdefault(s["brand"], []).append({
                "shoeId": shoe_id,
                "cushioning": proposed["cushioning"],
                "responsiveness": proposed["responsiveness"],
                "stability": proposed["stability"],
                "durability": proposed["durability"],
                "rawStability": s["rawStability"],
                "rawDurability": s["rawDurability"],
                "stabilityComponents": s["stabilityComponents"],
                "durabilityComponents": s["durabilityComponents"],
            })

        updated += 1
        time.sleep(0.3)  # API 레이트 리밋 방지

    synced_shoes = 0
    synced_files = 0
    if args.sync_production and updates_by_brand:
        for fname in sorted(BRANDS_DIR.iterdir()):
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
                specs = shoe["specs"]
                u = update_map[sid]
                shoe_changed = False
                for field in [
                    "cushioning", "responsiveness", "stability", "durability",
                    "rawStability", "rawDurability", "stabilityComponents", "durabilityComponents",
                ]:
                    new_val = u[field]
                    if new_val is None:
                        continue
                    if specs.get(field) != new_val:
                        specs[field] = new_val
                        shoe_changed = True
                        file_changed = True
                if shoe_changed:
                    synced_shoes += 1
            if file_changed:
                with open(fname, "w") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                synced_files += 1

    print(f"\n완료: {updated}개 research JSON 업데이트, {errors}개 오류")
    if args.sync_production:
        print(f"production 동기화: {synced_shoes}개 신발, {synced_files}개 브랜드 파일")
    elif updated > 0:
        print("\n▶ 필요하면 --sync-production 플래그로 production JSON까지 반영할 수 있습니다.")


if __name__ == "__main__":
    main()
