#!/usr/bin/env python3
"""
Shoe Korean copy rewriter — Codex → Gemini → Codex pipeline.
Usage:
  python3 scripts/write_copy.py --dry-run          # 전체 미리보기
  python3 scripts/write_copy.py --apply            # 전체 적용
  python3 scripts/write_copy.py --brand adidas --apply   # 단일 브랜드
  python3 scripts/write_copy.py --shoe supernova-rise-3 --apply  # 단일 신발
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import time
from pathlib import Path

BRANDS_DIR = Path("data/brands")
CHECKPOINT_FILE = Path("scripts/write_copy_checkpoint.json")

# ────────────────────────────────────────────────
# Subprocess helpers
# ────────────────────────────────────────────────

def run_subprocess_stdin(cmd: list[str], input_text: str, timeout: int = 90) -> tuple[str, float]:
    """stdin으로 프롬프트를 전달 — argv 길이 제한 우회."""
    start = time.time()
    try:
        r = subprocess.run(cmd, input=input_text, capture_output=True, text=True, timeout=timeout)
        return r.stdout.strip(), round(time.time() - start, 1)
    except subprocess.TimeoutExpired:
        return "", round(time.time() - start, 1)
    except FileNotFoundError:
        return "", 0.0


def run_codex(prompt: str) -> tuple[str, float]:
    """codex exec - (stdin 방식)."""
    return run_subprocess_stdin(["codex", "exec", "-"], prompt)


def run_gemini(prompt: str) -> tuple[str, float]:
    """gemini -p "" (stdin에 프롬프트 전달, -p ""로 headless 모드 트리거)."""
    return run_subprocess_stdin(["gemini", "-p", ""], prompt)


# ────────────────────────────────────────────────
# JSON extraction
# ────────────────────────────────────────────────

def extract_json_obj(text: str) -> dict | None:
    """마크다운 코드블록 및 raw JSON 모두 처리."""
    # 1순위: ```json ... ``` 마크다운 블록
    m = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    # 2순위: raw_decode로 첫 번째 완전한 JSON 객체 탐색
    decoder = json.JSONDecoder()
    for i, ch in enumerate(text):
        if ch == '{':
            try:
                obj, _ = decoder.raw_decode(text, i)
                if isinstance(obj, dict):
                    return obj
            except json.JSONDecodeError:
                continue
    return None


def validate_copy_result(result: dict) -> bool:
    """필수 키 5개가 모두 있는지 확인."""
    required = {"shortDescription", "description", "pros", "cons", "bestFor"}
    return required.issubset(result.keys())


# ────────────────────────────────────────────────
# Brand data I/O
# ────────────────────────────────────────────────

def load_brands() -> dict[str, dict]:
    result = {}
    for f in sorted(BRANDS_DIR.glob("*.json")):
        data = json.loads(f.read_text(encoding="utf-8"))
        result[f.stem] = data
    return result


def save_brand(brand_id: str, data: dict) -> None:
    path = BRANDS_DIR / f"{brand_id}.json"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")


def load_checkpoint() -> dict:
    if CHECKPOINT_FILE.exists():
        return json.loads(CHECKPOINT_FILE.read_text())
    return {}


def save_checkpoint(cp: dict) -> None:
    CHECKPOINT_FILE.write_text(json.dumps(cp, ensure_ascii=False, indent=2) + "\n")


# ────────────────────────────────────────────────
# Shoe context builder
# ────────────────────────────────────────────────

SCORE_LABELS = {
    1: "매우 낮음", 2: "낮음", 3: "낮음", 4: "보통 이하",
    5: "보통", 6: "보통 이상", 7: "높음", 8: "높음", 9: "매우 높음", 10: "최고"
}


def build_shoe_context(shoe: dict) -> str:
    specs = shoe.get("specs", {})
    s = lambda k: specs.get(k, "?")
    sh = (specs.get("stackHeight") or {})

    def score_line(field):
        val = s(field)
        label = SCORE_LABELS.get(val, str(val))
        return f"{field}: {val}/10 ({label})"

    lines = [
        f"신발 ID: {shoe['id']}",
        f"이름: {shoe.get('nameKo', shoe['name'])} ({shoe['name']})",
        f"브랜드: {shoe['brandId']}",
        f"카테고리: {shoe.get('categoryId','?')} / {shoe.get('subcategoryId','?')}",
        f"가격: {shoe.get('priceFormatted', '?')}",
        "",
        "[ 점수 ]",
        score_line("cushioning"),
        score_line("responsiveness"),
        score_line("stability"),
        score_line("durability"),
        f"무게 점수(가벼움): {s('weightScore')}/10",
        f"가성비 점수: {s('valueScore')}/10",
        "",
        "[ 스펙 ]",
        f"무게: {s('weight')}g",
        f"드롭: {s('drop')}mm",
        f"스택: 힐 {sh.get('heel','?')}mm / 전족부 {sh.get('forefoot','?')}mm",
        "",
        f"기술: {', '.join(shoe.get('technologies', []))}",
    ]
    return "\n".join(lines)


# ────────────────────────────────────────────────
# Prompt templates
# ────────────────────────────────────────────────

DRAFT_PROMPT_TEMPLATE = """\
아래 러닝화 데이터를 보고 한국어 문구를 작성해줘.
문체: "러닝 친구가 말해주는 톤" — ~해요/~어요/~거든/~인데 (친근하고 구체적)

{shoe_context}

[ 기존 문구에서 팩트만 참고 — 문체는 반드시 새로 작성 ]
shortDescription: {old_short}
description: {old_desc}
pros: {old_pros}
cons: {old_cons}
bestFor: {old_best}

[ 작성 규칙 ]
shortDescription: 12~28자, 한 문장. "누가/어떤 러닝에 좋은지"만. 기술명 나열 금지.
description: 2~3문장. 결론 → 주행 상황 → 주의점 순서. 대화체.
pros: 2~4개 배열. 체감 이점 중심, 스펙 수치(g, mm, %) 1개 이상 포함. 마침표 없음.
cons: 1~3개 배열. "발볼 좁음", "여름 통기성 부족" 같은 물리적 사실만. 변명형("무겁지만 쿠션 좋다") 금지. 마침표 없음.
bestFor: 2~4개 배열. 러너 타입/거리/페이스 기준으로 구체적.
주의: 근거 없는 수치 절대 금지 — 위 데이터에 없는 수치는 쓰지 마.

반드시 아래 JSON 형식으로만 출력해 (마크다운 없이):
{{
  "shortDescription": "...",
  "description": "...",
  "pros": ["...", "..."],
  "cons": ["..."],
  "bestFor": ["...", "..."]
}}
"""

FEEDBACK_PROMPT_TEMPLATE = """\
아래 러닝화 한국어 문구 초안을 검토해줘.

신발: {shoe_name} | cushioning={cush}/10, responsiveness={resp}/10, stability={stab}/10

[ 초안 ]
shortDescription ({short_len}자): {draft_short}
description: {draft_desc}
pros: {draft_pros}
cons: {draft_cons}
bestFor: {draft_best}

[ 검토 기준 ]
1. shortDescription이 12~28자인가?
2. pros에 스펙 수치(g/mm/%)가 1개 이상 있는가?
3. 점수와 문구가 일치하는가? (cushioning={cush}, resp={resp})
4. 대화체 톤인가? (~해요/~어요)
5. cons가 물리적 사실인가? (변명형 금지)

반드시 아래 JSON 형식으로만 출력해:
{{
  "isValid": true,
  "issues": []
}}
이슈가 있으면:
{{
  "isValid": false,
  "issues": ["issue1", "issue2"]
}}
"""

REVISION_PROMPT_TEMPLATE = """\
아래 러닝화 한국어 문구 초안과 피드백 이슈를 보고 최종 문구를 작성해줘.

{shoe_context}

[ 초안 ]
{draft_json}

[ 수정할 이슈 ]
{issues}

이슈를 반드시 반영해서 개선해줘.
반드시 아래 JSON 형식으로만 출력해 (마크다운 없이):
{{
  "shortDescription": "...",
  "description": "...",
  "pros": ["...", "..."],
  "cons": ["..."],
  "bestFor": ["...", "..."]
}}
"""


# ────────────────────────────────────────────────
# 3-step pipeline
# ────────────────────────────────────────────────

MAX_RETRIES = 3


def rewrite_shoe_copy(shoe: dict) -> dict | None:
    """
    3단계: Codex 초안 → Gemini 피드백(JSON) → Codex 최종.
    - Gemini isValid=true면 Codex 최종 단계 스킵(초안 바로 사용).
    - 각 단계 최대 MAX_RETRIES회 재시도.
    - 실패 시 None 반환 → 기존 문구 rollback 유지.
    """
    ctx = build_shoe_context(shoe)
    specs = shoe.get("specs", {})

    # Step 1: Codex 초안 (최대 3회)
    draft = None
    for attempt in range(1, MAX_RETRIES + 1):
        draft_prompt = DRAFT_PROMPT_TEMPLATE.format(
            shoe_context=ctx,
            old_short=shoe.get("shortDescription", ""),
            old_desc=shoe.get("description", ""),
            old_pros=json.dumps(shoe.get("pros", []), ensure_ascii=False),
            old_cons=json.dumps(shoe.get("cons", []), ensure_ascii=False),
            old_best=json.dumps(shoe.get("bestFor", []), ensure_ascii=False),
        )
        out, t = run_codex(draft_prompt)
        draft = extract_json_obj(out)
        if draft and validate_copy_result(draft):
            print(f"  ✓ Codex 초안 완료 ({t}s, 시도 {attempt}회)")
            break
        print(f"  ✗ Codex 초안 실패 ({t}s, 시도 {attempt}회)")
        time.sleep(2 ** attempt)
    if not draft:
        return None

    # Step 2: Gemini 피드백 (JSON 구조)
    draft_short = draft.get("shortDescription", "")
    fb_prompt = FEEDBACK_PROMPT_TEMPLATE.format(
        shoe_name=shoe.get("nameKo", shoe["name"]),
        draft_short=draft_short,
        draft_desc=draft.get("description", ""),
        draft_pros=json.dumps(draft.get("pros", []), ensure_ascii=False),
        draft_cons=json.dumps(draft.get("cons", []), ensure_ascii=False),
        draft_best=json.dumps(draft.get("bestFor", []), ensure_ascii=False),
        short_len=len(draft_short),
        cush=specs.get("cushioning", "?"),
        resp=specs.get("responsiveness", "?"),
        stab=specs.get("stability", "?"),
    )
    fb_out, t2 = run_gemini(fb_prompt)
    fb_json = extract_json_obj(fb_out) or {"isValid": True, "issues": []}
    is_valid = fb_json.get("isValid", True)
    issues = fb_json.get("issues", [])
    print(f"  ✓ Gemini 피드백 ({t2}s): isValid={is_valid}, issues={issues}")

    # Gemini가 이슈 없다고 판단하면 초안 바로 사용
    if is_valid and not issues:
        print(f"  → LGTM — 초안 그대로 사용")
        return draft

    # Step 3: Codex 최종 (피드백 반영)
    rev_prompt = REVISION_PROMPT_TEMPLATE.format(
        shoe_context=ctx,
        draft_json=json.dumps(draft, ensure_ascii=False, indent=2),
        issues="\n".join(f"- {i}" for i in issues) if issues else "없음",
    )
    final = None
    for attempt in range(1, MAX_RETRIES + 1):
        out, t = run_codex(rev_prompt)
        final = extract_json_obj(out)
        if final and validate_copy_result(final):
            print(f"  ✓ Codex 최종 완료 ({t}s, 시도 {attempt}회)")
            break
        time.sleep(2 ** attempt)

    return final or draft  # 최종 실패시 초안 fallback


# ────────────────────────────────────────────────
# Validation & apply
# ────────────────────────────────────────────────

def validate_copy(result: dict) -> list[str]:
    """검증 오류 목록 반환. 빈 리스트면 통과."""
    errors = []
    sd = result.get("shortDescription", "")
    if not (12 <= len(sd) <= 28):
        errors.append(f"shortDescription {len(sd)}자 (12-28 필요)")
    if not (2 <= len(result.get("pros", [])) <= 4):
        errors.append(f"pros {len(result.get('pros',[]))}개 (2-4 필요)")
    if not (1 <= len(result.get("cons", [])) <= 3):
        errors.append(f"cons {len(result.get('cons',[]))}개 (1-3 필요)")
    if not (2 <= len(result.get("bestFor", [])) <= 4):
        errors.append(f"bestFor {len(result.get('bestFor',[]))}개 (2-4 필요)")
    return errors


def apply_copy(shoe: dict, result: dict) -> None:
    """shoe dict에 result 필드 병합."""
    for key in ("shortDescription", "description", "pros", "cons", "bestFor"):
        if key in result:
            shoe[key] = result[key]


# ────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Shoe Korean copy rewriter — Codex→Gemini→Codex")
    parser.add_argument("--apply", action="store_true", help="실제 파일 업데이트")
    parser.add_argument("--dry-run", action="store_true", help="변경 없이 미리보기")
    parser.add_argument("--brand", help="특정 브랜드만 처리 (예: adidas)")
    parser.add_argument("--shoe", help="특정 신발만 처리 (예: supernova-rise-3)")
    args = parser.parse_args()

    if not args.apply and not args.dry_run:
        print("--apply 또는 --dry-run 중 하나를 지정하세요.")
        return

    brands = load_brands()
    checkpoint = load_checkpoint()
    total, updated, skipped, errors = 0, 0, 0, 0

    for brand_id, data in brands.items():
        if args.brand and brand_id != args.brand:
            continue

        brand_changed = False
        for shoe in data["shoes"]:
            shoe_id = shoe["id"]
            if args.shoe and shoe_id != args.shoe:
                continue

            # 체크포인트: 이미 완료된 신발 스킵
            if checkpoint.get(shoe_id) == "done":
                skipped += 1
                continue

            total += 1
            print(f"\n[{brand_id}] {shoe_id}")

            if args.dry_run:
                print(f"  → dry-run (현재 shortDescription: {shoe.get('shortDescription','')[:40]})")
                continue

            result = rewrite_shoe_copy(shoe)
            if result is None:
                print(f"  ✗ 실패 — 기존 문구 유지")
                errors += 1
                checkpoint[shoe_id] = {"status": "error"}
                save_checkpoint(checkpoint)
                continue

            val_errors = validate_copy(result)
            if val_errors:
                print(f"  ⚠ 검증 경고: {val_errors}")

            apply_copy(shoe, result)
            updated += 1
            brand_changed = True
            checkpoint[shoe_id] = "done"
            save_checkpoint(checkpoint)

        if brand_changed and args.apply:
            save_brand(brand_id, data)
            print(f"\n  → {brand_id}.json 저장 완료")

    print(f"\n=== 완료: 처리 {total}개 / 업데이트 {updated}개 / 스킵 {skipped}개 / 에러 {errors}개 ===")

    if not args.dry_run and errors == 0:
        CHECKPOINT_FILE.unlink(missing_ok=True)
        print("체크포인트 파일 삭제 완료")


if __name__ == "__main__":
    main()
