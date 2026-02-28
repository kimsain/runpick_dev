#!/usr/bin/env python3
"""
normalize_from_reviews.py  — Case C 정규화

RunRepeat 없음 + RTINGS 없음인 생산 신발의 스코어를
Claude API로 keyFindings 텍스트에서 추출.

결과는 research JSON의 proposedScores에만 저장.
data/brands/*.json 업데이트는 사람이 검토 후 수동으로 진행.

사용법:
  python3 scripts/normalize_from_reviews.py           # dry-run (API 호출 없음)
  python3 scripts/normalize_from_reviews.py --apply   # Claude API 호출 + research JSON 업데이트
"""

import argparse
import json
import os
import time
from pathlib import Path

from research_utils import resolve_research_files, describe_date_range

BRANDS_DIR = Path(__file__).parent.parent / "data" / "brands"

CLAUDE_MODEL = "claude-haiku-4-5-20251001"

EXTRACT_PROMPT = """\
다음은 러닝화 리뷰에서 추출한 텍스트입니다.
4개 항목의 점수(1~10 정수)를 추론해서 JSON으로만 반환하세요.

항목:
- cushioning (쿠셔닝/충격흡수): 1=매우 딱딱, 10=매우 푹신
- stability (안정성/지지력): 1=매우 불안정, 10=매우 안정적
- responsiveness (반응성/반발력): 1=매우 둔함, 10=매우 탄력적
- durability (내구성): 1=매우 빨리 닳음, 10=매우 오래 가는

규칙:
- 언급 없으면 6 (중립)
- 다른 텍스트 없이 JSON만 반환 (예: {{"cushioning": 7, "stability": 6, "responsiveness": 8, "durability": 6}})

리뷰 텍스트:
{findings_text}
"""


def get_attempt_status(attempt_log, source_name):
    for entry in attempt_log:
        if entry["source"] == source_name:
            return entry["status"]
    return None


def load_production():
    """Returns {shoe_id: {"brand": str, "subcategoryId": str}}"""
    production = {}
    for fpath in sorted(BRANDS_DIR.glob("*.json")):
        with open(fpath) as f:
            data = json.load(f)
        brand_id = data["brand"]["id"]
        for shoe in data["shoes"]:
            production[shoe["id"]] = {
                "brand": brand_id,
                "subcategoryId": shoe.get("subcategoryId", ""),
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
    for field in ["cushioning", "stability", "responsiveness", "durability"]:
        val = scores.get(field)
        if not isinstance(val, int) or val < 1 or val > 10:
            scores[field] = 6  # 기본값
    return scores


def main():
    parser = argparse.ArgumentParser(description="Case B 정성 텍스트 정규화")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Claude API 호출 후 research JSON proposedScores 업데이트 (없으면 dry-run)",
    )
    parser.add_argument("--date", metavar="YYYY-MM-DD", help="리서치 날짜 (기본: 최신)")
    parser.add_argument("--shoe-id", metavar="ID", help="특정 신발만 처리")
    args = parser.parse_args()

    research_files = resolve_research_files(args.date)
    production = load_production()

    case_b_shoes = []

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

        # Case B: RunRepeat 없음 + RTINGS 없음
        if rr_status == "found" or rt_status == "found":
            continue

        sources = research.get("sources", [])
        findings = collect_all_findings(sources)
        if not findings:
            continue  # 텍스트 데이터도 없으면 스킵

        case_b_shoes.append({
            "shoeId": shoe_id,
            "brand": production[shoe_id]["brand"],
            "subcatId": production[shoe_id]["subcategoryId"],
            "fpath": fpath,
            "research": research,
            "findings": findings,
            "currentScores": research.get("currentScores", {}),
        })

    # 미리보기
    mode_label = "적용 모드 (Claude API 호출)" if args.apply else "Dry-run (--apply 없으면 API 호출 없음)"
    date_info = describe_date_range(args.date)
    print(f"\n=== Case B 정성 텍스트 정규화 ({len(case_b_shoes)}개 신발) [{mode_label}] [{date_info}] ===\n")

    if not case_b_shoes:
        print("Case B 신발 없음 (RunRepeat 없음 + RTINGS 없음 + 정성 소스 보유 + 생산 포함).")
        return

    print(f"{'shoeId':<42} {'brand':<12} {'subcat':<14} {'현재스코어 cush/stab/resp/dura'}")
    print("-" * 100)
    for s in case_b_shoes:
        cs = s["currentScores"]
        scores_str = f"{cs.get('cushioning','-')}/{cs.get('stability','-')}/{cs.get('responsiveness','-')}/{cs.get('durability','-')}"
        print(f"{s['shoeId']:<42} {s['brand']:<12} {s['subcatId']:<14} {scores_str}")
        print(f"  소스 ({len(s['findings'])}개 finding): {s['findings'][0][:80]}...")

    if not args.apply:
        print(f"\n▶ --apply 플래그 추가 시 Claude API 호출 후 research JSON proposedScores 업데이트됩니다.")
        print(f"  모델: {CLAUDE_MODEL}")
        print(f"  예상 API 호출: {len(case_b_shoes)}회")
        return

    # Claude API 호출 + research JSON 업데이트
    print(f"\n[Claude API 호출 중... 모델: {CLAUDE_MODEL}]")
    updated = 0
    errors = 0

    for s in case_b_shoes:
        shoe_id = s["shoeId"]
        findings_text = "\n".join(f"- {f}" for f in s["findings"])

        print(f"\n  [{shoe_id}] API 호출 중...", end="", flush=True)
        try:
            proposed = call_claude(findings_text)
            print(f" → {proposed}")
        except Exception as e:
            print(f" ✗ 오류: {e}")
            errors += 1
            continue

        # research JSON 업데이트
        research = s["research"]
        old_proposed = research.get("proposedScores", {})

        research["proposedScores"] = proposed
        research["specsDecision"] = (
            f"[normalize_from_reviews.py] Claude {CLAUDE_MODEL} 기반 정성 텍스트 추출. "
            f"이전 proposed: {old_proposed}. 생산 적용 전 수동 검토 필요."
        )

        with open(s["fpath"], "w") as f:
            json.dump(research, f, indent=2, ensure_ascii=False)
            f.write("\n")

        updated += 1
        time.sleep(0.3)  # API 레이트 리밋 방지

    print(f"\n완료: {updated}개 research JSON 업데이트, {errors}개 오류")
    if updated > 0:
        print("\n▶ 다음 단계: research JSON의 proposedScores 검토 후 data/brands/*.json에 수동 적용")


if __name__ == "__main__":
    main()
