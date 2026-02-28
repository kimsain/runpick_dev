#!/usr/bin/env python3
"""
collect_shoe.py — 러닝화 데이터 자동 수집 오케스트레이터

5개 소스(RunRepeat, RTINGS, DOR, RTR, BITR)에서 데이터를 수집해
research/{today}/{brand}/{shoe_id}.json으로 저장한다.

사용:
    python3 scripts/collect_shoe.py --shoe-id gel-nimbus-28
    python3 scripts/collect_shoe.py --list               # 전체 신발 ID 출력
"""
import argparse
import json
import re
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

# 프로젝트 루트 (이 스크립트 기준 한 단계 위)
ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data" / "brands"
RESEARCH_DIR = ROOT / "research"
SCRIPTS_DIR = ROOT / "scripts"

SOURCE_CONFIG = [
    ("RunRepeat",          1, "quantitative", "runrepeat"),
    ("RTINGS",             2, "quantitative", "rtings"),
    ("Doctors of Running", 3, "qualitative",  "dor"),
    ("Road Trail Run",     4, "qualitative",  "rtr"),
    ("Believe in the Run", 5, "qualitative",  "bitr"),
]


CODEX_PROMPT_TEMPLATE = """\
Running shoe review text below. Extract key findings for these 4 metrics only:
1. Cushioning: softness, impact protection, heel/forefoot feel
2. Responsiveness: energy return, bounce, snappiness
3. Stability: torsional rigidity, heel counter, lateral support
4. Durability: outsole wear, material longevity

IMPORTANT: Respond with ONLY a JSON array. Do NOT include any explanation, preamble, or text outside the array.
Format: ["finding 1.", "finding 2.", "finding 3."]

Review text:
{text}
"""


def find_shoe(shoe_id: str):
    """모든 brand JSON에서 shoe_id 검색. 반환: (shoe_dict, brand_id) 또는 None."""
    for brand_file in sorted(DATA_DIR.glob("*.json")):
        data = json.loads(brand_file.read_text())
        for shoe in data.get("shoes", []):
            if shoe.get("id") == shoe_id:
                return shoe, brand_file.stem
    return None, None


def list_shoes():
    """전체 신발 ID 출력."""
    count = 0
    for brand_file in sorted(DATA_DIR.glob("*.json")):
        data = json.loads(brand_file.read_text())
        brand_id = brand_file.stem
        for shoe in data.get("shoes", []):
            sid = shoe.get("id", "?")
            name = shoe.get("name", "")
            print(f"{brand_id:<18} {sid:<35} {name}")
            count += 1
    print(f"\n총 {count}개 신발")


def run_subprocess(cmd: list) -> tuple:
    """subprocess 실행. 반환: (stdout_str, elapsed_sec, error_str|None)."""
    t0 = time.time()
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=60
        )
        elapsed = round(time.time() - t0, 1)
        if result.returncode != 0:
            return None, elapsed, result.stderr.strip() or "non-zero exit"
        return result.stdout.strip(), elapsed, None
    except subprocess.TimeoutExpired:
        return None, 60.0, "timeout"
    except Exception as e:
        return None, round(time.time() - t0, 1), str(e)



def _nn(d: dict) -> dict:
    """None 값인 키 제거. scale 같은 문자열 값은 보존."""
    return {k: v for k, v in d.items() if v is not None}


def _rr_attr_scores(data: dict) -> dict:
    """fetch_runrepeat 출력 → 포괄적 attributeScores (normalizer 호환 필드 포함)."""
    c  = data.get("cushioning")    or {}
    r  = data.get("responsiveness") or {}
    s  = data.get("stability")     or {}
    d  = data.get("durability")    or {}
    p  = data.get("physical")      or {}
    sf = data.get("sizeAndFit")    or {}
    m  = data.get("misc")          or {}

    def mm(val):
        return f"{val} mm" if isinstance(val, (int, float)) else None

    return {
        "cushioning": _nn({
            "heelShockAbsorption":    c.get("heelShockAbsorption"),       # normalizer
            "forefootShockAbsorption":c.get("forefootShockAbsorption"),   # normalizer
            "midsoleSoftness_ha":     c.get("midsoleSoftness_ha"),
            "midsoleSoftnessCold_ha": c.get("midsoleSoftnessCold_ha"),
            "midsoleSoftness_ac":     c.get("midsoleSoftness_ac"),
            "scale":   "SA",
            "scaleHA": "Shore A (≤v2.1)",
            "scaleAC": "Asker C (v2.2+)",
        }),
        "responsiveness": _nn({
            "heelEnergyReturn":    r.get("heelEnergyReturn"),             # normalizer
            "forefootEnergyReturn":r.get("forefootEnergyReturn"),         # normalizer
            "scale": "%",
        }),
        "stability": _nn({
            "torsionalRigidity":       s.get("torsionalRigidity"),        # normalizer
            "heelCounterStiffness":    s.get("heelCounterStiffness"),     # normalizer
            "midsoleWidthForefoot_mm": s.get("midsoleWidthForefoot_mm"),
            "midsoleWidthHeel_mm":     s.get("midsoleWidthHeel_mm"),
            "scale":      "/5",
            "scaleWidth": "mm",
        }),
        "durability": _nn({
            "outsoleDurability":       mm(d.get("outsoleDurability_mm")), # normalizer
            "outsoleThickness":        mm(d.get("outsoleThickness_mm")),  # normalizer
            "toeboxDurability":        d.get("toeboxDurability"),
            "heelPaddingDurability":   d.get("heelPaddingDurability"),
            "scale":                "mm",
            "scaleDurabilityRating":"rating 1-5",
        }),
        "physical": _nn({
            "weight_g":         p.get("weight_g"),
            "drop_mm":          p.get("drop_mm"),
            "heelStack_mm":     p.get("heelStack_mm"),
            "forefootStack_mm": p.get("forefootStack_mm"),
            "flexStiffness_n":  p.get("flexStiffness_n"),
            "stiffness_n":      p.get("stiffness_n"),
            "stiffnessCold_n":  p.get("stiffnessCold_n"),
            "stiffnessCold_pct":p.get("stiffnessCold_pct"),
            "forefootTraction": p.get("forefootTraction"),
            "heelTraction":     p.get("heelTraction"),
            "rocker_deg":       p.get("rocker_deg"),
            "plate":            p.get("plate"),
            "scale": "mixed",
        }),
        "sizeAndFit": _nn({
            "toeboxWidthWidest_mm":    sf.get("toeboxWidthWidest_mm"),
            "toeboxWidthBigToe_mm":    sf.get("toeboxWidthBigToe_mm"),
            "toeboxWidthWidestPart_mm":sf.get("toeboxWidthWidestPart_mm"),
            "toeboxWidthBigToePart_mm":sf.get("toeboxWidthBigToePart_mm"),
            "internalLength_mm":       sf.get("internalLength_mm"),
            "toeboxHeight_mm":         sf.get("toeboxHeight_mm"),
            "sizeRating":              sf.get("sizeRating"),
            "scale": "mixed",
        }),
        "misc": _nn({
            "breathability":          m.get("breathability"),
            "outsoleHardness_hc":     m.get("outsoleHardness_hc"),
            "midsoleSoftnessCold_pct":m.get("midsoleSoftnessCold_pct"),
            "insoleThickness_mm":     m.get("insoleThickness_mm"),
            "tonguePadding_mm":       m.get("tonguePadding_mm"),
            "tongueGussetType":       m.get("tongueGussetType"),
            "heelTab":                m.get("heelTab"),
            "removableInsole":        m.get("removableInsole"),
            "reflectiveElements":     m.get("reflectiveElements"),
            "scale": "mixed",
        }),
    }


def _rtings_attr_scores(data: dict) -> dict:
    """fetch_rtings 출력 → 포괄적 attributeScores (normalizer 호환 필드 포함)."""
    raw = data.get("attributeScores") or {}
    c   = raw.get("cushioning")    or {}
    r   = raw.get("responsiveness") or {}
    lc  = data.get("cushioning")   or {}    # raw cushioning group from fetch_rtings (firmnessScore 등)
    fit = data.get("fit")          or {}

    return {
        "cushioning": _nn({
            "heelShockAbsorption":    c.get("heelShockAbsorption"),       # normalizer
            "forefootShockAbsorption":c.get("forefootShockAbsorption"),   # normalizer
            "heelFirmnessScore":      lc.get("heelFirmnessScore"),
            "forefootFirmnessScore":  lc.get("forefootFirmnessScore"),
            "longRunForefoot_score":  lc.get("longRunForefoot_score"),
            "scale": c.get("scale", "/10"),
        }),
        "responsiveness": _nn({
            "heelEnergyReturn":    r.get("heelEnergyReturn"),             # normalizer
            "forefootEnergyReturn":r.get("forefootEnergyReturn"),         # normalizer
            "scale": r.get("scale", "%"),
        }),
        "firmnessHeel":    _nn({**(data.get("firmnessHeel")     or {}), "scale": "N/mm"}),
        "firmnessForefoot":_nn({**(data.get("firmnessForefoot")  or {}), "scale": "N/mm"}),
        "energyHeel":      _nn({**(data.get("energyHeel")        or {}), "scale": "J"}),
        "energyForefoot":  _nn({**(data.get("energyForefoot")    or {}), "scale": "J"}),
        "longRun":         _nn({**(data.get("longRun")           or {}), "scale": "J"}),
        "physical":        _nn({**(data.get("physical")          or {}), "scale": "mixed"}),
        "design":          _nn({**(data.get("design")            or {}), "scale": "categorical"}),
        "fitScores": _nn({
            "lengthFitScore":        fit.get("lengthFitScore"),
            "forefootWidthFitScore": fit.get("forefootWidthFitScore"),
            "archWidthFitScore":     fit.get("archWidthFitScore"),
            "forefootHeightFitScore":fit.get("forefootHeightFitScore"),
            "scale": "/10",
        }),
        "fitDeviations": _nn({
            "toeTtsDeviation_mm":        fit.get("toeTtsDeviation_mm"),
            "ballOfFootTtsDeviation_mm": fit.get("ballOfFootTtsDeviation_mm"),
            "archWidthTtsDeviation_mm":  fit.get("archWidthTtsDeviation_mm"),
            "scale": "mm",
        }),
    }


def _rr_key_findings(data: dict) -> list:
    """RunRepeat 수집 데이터에서 핵심 수치 요약."""
    c = data.get("cushioning", {})
    r = data.get("responsiveness", {})
    p = data.get("physical", {})
    lines = []
    hs = c.get("heelShockAbsorption")
    fs = c.get("forefootShockAbsorption")
    if hs is not None and fs is not None:
        lines.append(f"Shock absorption heel/forefoot: {hs} / {fs} SA")
    hr = r.get("heelEnergyReturn")
    fr = r.get("forefootEnergyReturn")
    if hr is not None and fr is not None:
        lines.append(f"Energy return heel/forefoot: {hr}% / {fr}%")
    w   = p.get("weight_g")
    dr  = p.get("drop_mm")
    hs2 = p.get("heelStack_mm")
    fs2 = p.get("forefootStack_mm")
    if any(x is not None for x in [w, dr, hs2, fs2]):
        lines.append(f"Lab specs weight/drop/stack: {w}g, {dr}mm, {hs2}mm/{fs2}mm")
    return lines or ["No quantitative data extracted."]


def collect_runrepeat(shoe_id: str, url: str) -> tuple:
    """RunRepeat 수집. 반환: (source_dict, attempt_dict)."""
    stdout, elapsed, err = run_subprocess([
        sys.executable, str(SCRIPTS_DIR / "fetch_runrepeat.py"),
        "--fetch", url, "--shoe-id", shoe_id,
    ])
    attempt = {"source": "RunRepeat", "status": "found", "elapsedSec": elapsed,
               "url": url, "reason": None}
    if err or not stdout:
        attempt.update(status="error", reason=err or "empty_output")
        return None, attempt
    try:
        data = json.loads(stdout)
    except json.JSONDecodeError as e:
        attempt.update(status="error", reason=f"json_parse: {e}")
        return None, attempt

    source = {
        "source": "RunRepeat", "priority": 1, "url": url, "type": "quantitative",
        "attributeScores": _rr_attr_scores(data),
        "keyFindings":      _rr_key_findings(data),
    }
    return source, attempt


def collect_rtings(shoe_id: str, url: str) -> tuple:
    """RTINGS 수집. 반환: (source_dict, attempt_dict)."""
    stdout, elapsed, err = run_subprocess([
        sys.executable, str(SCRIPTS_DIR / "fetch_rtings.py"),
        "--fetch", url, "--shoe-id", shoe_id,
    ])
    attempt = {"source": "RTINGS", "status": "found", "elapsedSec": elapsed,
               "url": url, "reason": None}
    if err or not stdout:
        attempt.update(status="error", reason=err or "empty_output")
        return None, attempt
    try:
        data = json.loads(stdout)
    except json.JSONDecodeError as e:
        attempt.update(status="error", reason=f"json_parse: {e}")
        return None, attempt

    attr = _rtings_attr_scores(data)
    r = attr.get("responsiveness", {})
    c = attr.get("cushioning", {})
    findings = []
    if r.get("heelEnergyReturn") is not None:
        findings.append(f"Heel ER: {r['heelEnergyReturn']}%")
    if r.get("forefootEnergyReturn") is not None:
        findings.append(f"Forefoot ER: {r['forefootEnergyReturn']}%")
    if c.get("heelShockAbsorption") is not None:
        findings.append(f"Heel Cushioning: {c['heelShockAbsorption']} /10")
    if c.get("forefootShockAbsorption") is not None:
        findings.append(f"Forefoot Cushioning: {c['forefootShockAbsorption']} /10")

    source = {
        "source": "RTINGS", "priority": 2, "url": url, "type": "quantitative",
        "attributeScores": attr,
        "keyFindings":      findings or ["No quantitative data extracted."],
    }
    return source, attempt


def collect_review(shoe_id: str, source_name: str, priority: int, url: str) -> tuple:
    """정성리뷰 수집 + Codex keyFindings. 반환: (source_dict, attempt_dict)."""
    attempt = {"source": source_name, "status": "found", "elapsedSec": 0,
               "url": url, "reason": None}

    # fetch_reviews.py로 rawText 수집
    stdout, elapsed, err = run_subprocess([
        sys.executable, str(SCRIPTS_DIR / "fetch_reviews.py"),
        "--fetch", url, "--shoe-id", shoe_id,
    ])
    attempt["elapsedSec"] = elapsed

    if err or not stdout:
        attempt.update(status="error", reason=err or "empty_output")
        return None, attempt
    try:
        review_data = json.loads(stdout)
    except json.JSONDecodeError as e:
        attempt.update(status="error", reason=f"json_parse: {e}")
        return None, attempt

    raw_text = review_data.get("rawText", "")
    if not raw_text:
        attempt.update(status="error", reason="empty_rawText")
        return None, attempt

    # Codex로 keyFindings 생성
    prompt = CODEX_PROMPT_TEMPLATE.format(text=raw_text[:8000])
    codex_out, codex_elapsed, _ = run_subprocess(["codex", "exec", prompt])
    attempt["elapsedSec"] = round(elapsed + codex_elapsed, 1)

    key_findings = []
    if codex_out:
        # codex exec stdout에는 헤더/thinking 메타가 섞임 → 마지막 [...] 추출 (greedy)
        m = re.search(r'\[[\s\S]*\]', codex_out)
        if m:
            try:
                key_findings = json.loads(m.group(0))
                if not isinstance(key_findings, list):
                    key_findings = []
            except json.JSONDecodeError:
                pass
    if not key_findings:
        # Codex 실패 fallback: rawText 앞 3문장
        sentences = [s.strip() for s in raw_text.replace('\n', ' ').split('.') if len(s.strip()) > 20]
        key_findings = [s + '.' for s in sentences[:3]]

    source = {
        "source": source_name, "priority": priority, "url": url, "type": "qualitative",
        "keyFindings": key_findings,
    }
    return source, attempt


def build_research_json(shoe: dict, brand_id: str, shoe_id: str,
                         research_date: str, sources: list, attempts: list) -> dict:
    """Research JSON 조립. normalize_from_*.py 호환 스키마."""
    specs = shoe.get("specs", {})
    current_specs = {
        "weight":       specs.get("weight"),
        "drop":         specs.get("drop"),
        "heelStack":    (specs.get("stackHeight") or {}).get("heel"),
        "forefootStack":(specs.get("stackHeight") or {}).get("forefoot"),
    }

    # specConflicts: RunRepeat vs RTINGS vs current
    rr_src  = next((s for s in sources if s["source"] == "RunRepeat"), None)
    rtg_src = next((s for s in sources if s["source"] == "RTINGS"), None)
    conflicts = []

    def _maybe_conflict(field, cur, rr_val, rtg_val, threshold=2):
        # raw 값이 문자열·None 섞일 수 있으므로 숫자만 통과
        def _num(v):
            return v if isinstance(v, (int, float)) else None
        cur     = _num(cur)
        rr_val  = _num(rr_val)
        rtg_val = _num(rtg_val)
        vals = [x for x in [cur, rr_val, rtg_val] if x is not None]
        if len(vals) >= 2 and max(vals) - min(vals) > threshold:
            conflicts.append({"field": field, "current": cur,
                              "runRepeat": rr_val, "rtings": rtg_val,
                              "notes": "Quantitative source variance vs baseline."})

    rr_phys  = (rr_src  or {}).get("attributeScores", {}).get("physical", {})
    rtg_phys = (rtg_src or {}).get("attributeScores", {}).get("physical", {})
    # weight: 10g 이상 차이만 충돌로 기록 (개체 편차 노이즈 제거)
    _maybe_conflict("weight",
                    current_specs["weight"],
                    rr_phys.get("weight_g"),
                    rtg_phys.get("weight_g"),
                    threshold=10)
    # drop/stack: 1–2mm 이상 차이 기록
    _maybe_conflict("drop",
                    current_specs["drop"],
                    rr_phys.get("drop_mm"),
                    rtg_phys.get("drop_mm"),
                    threshold=1)
    _maybe_conflict("heelStack",
                    current_specs["heelStack"],
                    rr_phys.get("heelStack_mm"),
                    rtg_phys.get("heelStack_mm"),
                    threshold=2)
    _maybe_conflict("forefootStack",
                    current_specs["forefootStack"],
                    rr_phys.get("forefootStack_mm"),
                    rtg_phys.get("forefootStack_mm"),
                    threshold=2)

    quant_count = sum(1 for s in sources if s["type"] == "quantitative")
    qual_count  = sum(1 for s in sources if s["type"] == "qualitative")
    if quant_count >= 2:
        confidence = "high"
    elif quant_count == 1:
        confidence = "medium"
    elif qual_count >= 1:
        confidence = "low"
    else:
        confidence = "none"

    current_scores = {
        "cushioning":    specs.get("cushioning"),
        "responsiveness":specs.get("responsiveness"),
        "stability":     specs.get("stability"),
        "durability":    specs.get("durability"),
    }

    return {
        "shoeId":        shoe_id,
        "modelName":     shoe.get("name", shoe_id),
        "researchDate":  research_date,
        "attemptLog":    attempts,
        "sources":       sorted(sources, key=lambda s: s["priority"]),
        "confidence":    confidence,
        "currentSpecs":  current_specs,
        "proposedSpecs": dict(current_specs),
        "specConflicts": conflicts,
        "currentScores":  current_scores,
        "proposedScores": dict(current_scores),
        "scoreDiffs":     [],
        "specsDecision":  "No automatic score/spec change proposed. Conflicts were recorded for reviewer decision.",
    }


def save_research(research: dict, brand_id: str, shoe_id: str, research_date: str) -> Path:
    """research/{date}/{brand}/{shoe_id}.json 에 저장."""
    out_dir = RESEARCH_DIR / research_date / brand_id
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{shoe_id}.json"
    out_path.write_text(json.dumps(research, ensure_ascii=False, indent=2))
    return out_path


def main():
    parser = argparse.ArgumentParser(description="러닝화 데이터 자동 수집")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--shoe-id", metavar="ID", help="수집할 신발 ID")
    group.add_argument("--list", action="store_true", help="전체 신발 ID 목록 출력")
    parser.add_argument("--date", metavar="YYYY-MM-DD", help="리서치 날짜 (기본: 오늘)")
    args = parser.parse_args()

    if args.list:
        list_shoes()
        return

    research_date = args.date or str(date.today())
    shoe, brand_id = find_shoe(args.shoe_id)
    if shoe is None:
        print(f"[ERROR] 신발 ID를 찾을 수 없음: {args.shoe_id}", file=sys.stderr)
        print("  --list 로 전체 ID 확인", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] 수집 시작: {args.shoe_id} ({shoe.get('name', '')}) / {brand_id}")

    urls = shoe.get("sources", {})
    sources = []
    attempts = []

    # RunRepeat
    rr_url = urls.get("runrepeat")
    if rr_url:
        print("[INFO] RunRepeat 수집 중...")
        src, att = collect_runrepeat(args.shoe_id, rr_url)
        attempts.append(att)
        if src:
            sources.append(src)
    else:
        attempts.append({"source":"RunRepeat","status":"not_found","elapsedSec":0,"url":None,"reason":"missing_url"})

    # RTINGS
    rtings_url = urls.get("rtings")
    if rtings_url:
        print("[INFO] RTINGS 수집 중...")
        src, att = collect_rtings(args.shoe_id, rtings_url)
        attempts.append(att)
        if src:
            sources.append(src)
    else:
        attempts.append({"source":"RTINGS","status":"not_found","elapsedSec":0,"url":None,"reason":"missing_url"})

    # Qualitative reviews (DOR, RTR, BITR)
    for source_name, priority, url_key in [
        ("Doctors of Running", 3, "dor"),
        ("Road Trail Run",     4, "rtr"),
        ("Believe in the Run", 5, "bitr"),
    ]:
        rev_url = urls.get(url_key)
        if rev_url:
            print(f"[INFO] {source_name} 수집 중...")
            src, att = collect_review(args.shoe_id, source_name, priority, rev_url)
            attempts.append(att)
            if src:
                sources.append(src)
        else:
            attempts.append({"source": source_name, "status": "not_found",
                             "elapsedSec": 0, "url": None, "reason": "missing_url"})

    research = build_research_json(shoe, brand_id, args.shoe_id, research_date, sources, attempts)
    out_path = save_research(research, brand_id, args.shoe_id, research_date)
    print(f"[DONE] 저장 완료: {out_path}")
    print(f"       confidence: {research['confidence']}, sources: {len(sources)}개")
    for att in attempts:
        icon = "✓" if att["status"] == "found" else "✗"
        print(f"  {icon} {att['source']:<25} {att['status']}")


if __name__ == "__main__":
    main()
