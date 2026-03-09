#!/usr/bin/env python3
"""Shared stability/durability v3 helpers."""

from __future__ import annotations

import re
from typing import Any

from formulas import (
    SCORE_VERSION,
    SUBCAT_STAB_DELTA,
    stability_structure_component,
    stability_rr_platform_component,
    stability_rtings_outsole_platform_component,
    stability_rtings_ratio_platform_component,
    stability_platform_component,
    stability_softness_from_ac,
    stability_softness_from_rtings_firmness,
    stability_sway_penalty,
    stability_qualitative_modifier,
    stability_intermediate_v3,
    stability_from_intermediate_v3,
    raw_stability_from_intermediate_v3,
    durability_outsole_component,
    durability_outsole_from_abrasion_only,
    durability_upper_component,
    durability_midsole_longevity_component,
    durability_midsole_longevity_modifier,
    durability_compound_modifier,
    durability_qualitative_modifier,
    durability_intermediate_v3,
    durability_from_intermediate_v3,
    raw_durability_from_intermediate_v3,
    weighted_mean_available,
    MIDSOLE_LONGRUN_CORE_ENABLED,
)

STABILITY_SIGNAL_PATTERNS = {
    "lockdown": re.compile(
        r"\b(lockdown|locked[- ]in|secure (?:fit|upper|heel|containment)|contained)\b",
        re.IGNORECASE,
    ),
    "guidance_sidewall": re.compile(
        r"\b(guide ?rail|guidance|medial post|sidewall|stable-neutral|stable platform|stable ride|lateral support|rearfoot build)\b",
        re.IGNORECASE,
    ),
    "wide_base": re.compile(
        r"\b(wide (?:base|platform|forefoot)|broad (?:base|platform)|sole flare|filled midfoot)\b",
        re.IGNORECASE,
    ),
    "heel_slip": re.compile(
        r"\b(heel slip|heel slippage|heel lift|slippage)\b",
        re.IGNORECASE,
    ),
    "instability": re.compile(
        r"\b(unstable|wobbly|tippy|squirrely|less stable|reduced lateral stability|quick pronation|collapse|awkward landing)\b",
        re.IGNORECASE,
    ),
}

DURABILITY_SIGNAL_PATTERNS = {
    "outsole_coverage": re.compile(
        r"\b(extensive|substantial|full|ample|plenty of)\s+(?:outsole|rubber)?\s*coverage\b|\brear wrap\b",
        re.IGNORECASE,
    ),
    "upper_reinforcement": re.compile(
        r"\b(overlay|reinforcement|reinforced|toe bumper|protective upper)\b",
        re.IGNORECASE,
    ),
    "durable": re.compile(
        r"\b(durable|holds? up|long-lasting|longevity|minimal wear|little to no wear|reliable .*life|200-300 miles|250 miles)\b",
        re.IGNORECASE,
    ),
    "early_wear": re.compile(
        r"\b(wear(?:s|ing)? (?:fast|quickly|sooner)|visible .*wear|heavy wear|poor durability|worn quickly|peeling|200 miles rather than 400|below normal)\b",
        re.IGNORECASE,
    ),
    "exposed_foam": re.compile(
        r"\b(exposed foam|minimal outsole coverage|less outsole rubber|thin outsole coverage)\b",
        re.IGNORECASE,
    ),
    "midsole_breakdown": re.compile(
        r"\b(pack out|bottom out|compression set|breaks down|midsole wear|midsole creasing|loses pop|loses rebound|compression marks)\b",
        re.IGNORECASE,
    ),
}


def get_source(sources: list[dict[str, Any]], source_name: str) -> dict[str, Any] | None:
    for src in sources:
        if src.get("source") == source_name:
            return src
    return None


def parse_mm(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace("mm", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _dimension_lines(sources: list[dict[str, Any]], dimension: str) -> list[dict[str, Any]]:
    prefix = f"{dimension.lower()}:"
    rows = []
    for src in sources:
        if src.get("type") != "qualitative":
            continue
        lines = [
            line for line in src.get("keyFindings", [])
            if isinstance(line, str) and line.lower().startswith(prefix)
        ]
        if lines:
            rows.append({"source": src.get("source", "unknown"), "lines": lines})
    return rows


def _signal_payload(rows: list[dict[str, Any]], patterns: dict[str, re.Pattern], modifier_fn) -> dict[str, Any]:
    counts = {key: 0 for key in patterns}
    source_count = len(rows)
    finding_count = sum(len(row["lines"]) for row in rows)
    for row in rows:
        text = " ".join(row["lines"])
        for signal, pattern in patterns.items():
            if pattern.search(text):
                counts[signal] += 1
    shares = {
        key: round(counts[key] / source_count, 4) if source_count else 0.0
        for key in patterns
    }
    modifier = modifier_fn(**shares) if source_count else 0.0
    return {
        "scoreVersion": SCORE_VERSION,
        "sourceCount": source_count,
        "findingCount": finding_count,
        "counts": counts,
        "shares": shares,
        "modifierRaw": modifier,
    }


def derive_signals(sources: list[dict[str, Any]]) -> dict[str, Any]:
    stab_rows = _dimension_lines(sources, "stability")
    dur_rows = _dimension_lines(sources, "durability")
    return {
        "stability": _signal_payload(stab_rows, STABILITY_SIGNAL_PATTERNS, stability_qualitative_modifier),
        "durability": _signal_payload(dur_rows, DURABILITY_SIGNAL_PATTERNS, durability_qualitative_modifier),
    }


def _stack_input(rr_src: dict[str, Any] | None, rt_src: dict[str, Any] | None, existing_specs: dict[str, Any]) -> dict[str, Any]:
    rr_phys = (rr_src or {}).get("attributeScores", {}).get("physical", {})
    if rr_phys.get("heelStack_mm") is not None:
        return {
            "source": "runrepeat",
            "heel": rr_phys.get("heelStack_mm"),
            "forefoot": rr_phys.get("forefootStack_mm"),
        }
    rt_phys = (rt_src or {}).get("attributeScores", {}).get("physical", {})
    if rt_phys.get("heelStack_mm") is not None:
        return {
            "source": "rtings",
            "heel": rt_phys.get("heelStack_mm"),
            "forefoot": rt_phys.get("forefootStack_mm"),
        }
    stack = existing_specs.get("stackHeight", {}) or {}
    return {
        "source": "production",
        "heel": stack.get("heel"),
        "forefoot": stack.get("forefoot"),
    }


def _softness_input(rr_src: dict[str, Any] | None, rt_src: dict[str, Any] | None, subcategory: str) -> dict[str, Any]:
    rr_cush = (rr_src or {}).get("attributeScores", {}).get("cushioning", {})
    heel_ac = rr_cush.get("midsoleSoftness_ac")
    secondary_ac = rr_cush.get("secondaryFoamSoftness_ac")
    if heel_ac is not None or secondary_ac is not None:
        softness, proxy_ac = stability_softness_from_ac(
            heel_ac=heel_ac,
            secondary_foam_ac=secondary_ac,
            subcategory=subcategory,
        )
        return {
            "source": "runrepeat_ac",
            "softnessScalar": softness,
            "proxyAc": proxy_ac,
            "heelAc": heel_ac,
            "secondaryAc": secondary_ac,
        }

    rt_attr = (rt_src or {}).get("attributeScores", {})
    heel_firm = (rt_attr.get("firmnessHeel") or {}).get("at1100N_Nmm")
    fore_firm = (rt_attr.get("firmnessForefoot") or {}).get("at1300N_Nmm")
    rt_soft = stability_softness_from_rtings_firmness(heel_firm, fore_firm)
    if rt_soft is not None:
        return {
            "source": "rtings_firmness",
            "softnessScalar": rt_soft,
            "proxyAc": None,
            "heelFirmness1100": heel_firm,
            "forefootFirmness1300": fore_firm,
        }

    softness, proxy_ac = stability_softness_from_ac(subcategory=subcategory)
    return {
        "source": "subcategory_prior",
        "softnessScalar": softness,
        "proxyAc": proxy_ac,
    }


def compute_stability_v3(sources: list[dict[str, Any]], existing_specs: dict[str, Any],
                         subcategory: str, derived: dict[str, Any] | None = None) -> tuple[int, float, dict[str, Any], dict[str, Any]]:
    derived = derived or derive_signals(sources)
    rr_src = get_source(sources, "RunRepeat")
    rt_src = get_source(sources, "RTINGS")

    rr_attr = (rr_src or {}).get("attributeScores", {})
    rr_stab = rr_attr.get("stability", {}) or {}
    rt_attr = (rt_src or {}).get("attributeScores", {})
    rt_phys = rt_attr.get("physical", {}) or {}

    structure_score = stability_structure_component(
        rr_stab.get("torsionalRigidity"),
        rr_stab.get("heelCounterStiffness"),
    )
    rr_platform = stability_rr_platform_component(
        rr_stab.get("midsoleWidthHeel_mm"),
        rr_stab.get("midsoleWidthForefoot_mm"),
    )
    rt_outsole_platform = stability_rtings_outsole_platform_component(
        rt_phys.get("outsoleHeelWidth_mm"),
        rt_phys.get("outsoleForefootWidth_mm"),
    )
    rt_ratio_platform = stability_rtings_ratio_platform_component(
        rt_phys.get("heelWidthToStackRatio"),
        rt_phys.get("forefootWidthToStackRatio"),
    )
    platform_score = stability_platform_component(
        rr_platform=rr_platform,
        rt_outsole_platform=rt_outsole_platform,
        rt_ratio_platform=rt_ratio_platform,
    )

    stack_input = _stack_input(rr_src, rt_src, existing_specs)
    softness_input = _softness_input(rr_src, rt_src, subcategory)
    sway_penalty = stability_sway_penalty(
        stack_input.get("heel"),
        stack_input.get("forefoot"),
        softness_input.get("softnessScalar"),
    )
    qual_modifier = derived["stability"]["modifierRaw"]
    intermediate = stability_intermediate_v3(
        structure_score=structure_score,
        platform_score=platform_score,
        subcategory=subcategory,
        sway_penalty=sway_penalty,
        qual_modifier=qual_modifier,
    )
    core_score = weighted_mean_available([
        (structure_score, 0.55),
        (platform_score, 0.45),
    ])
    components = {
        "scoreVersion": SCORE_VERSION,
        "structureScore": structure_score,
        "platformScore": platform_score,
        "platformInputs": {
            "runRepeatMidsoleScore": rr_platform,
            "rtingsOutsoleScore": rt_outsole_platform,
            "rtingsWidthToStackScore": rt_ratio_platform,
        },
        "coreScore": round(core_score, 2) if core_score is not None else None,
        "subcategoryDelta": SUBCAT_STAB_DELTA.get(subcategory, 0.0),
        "swayPenalty": sway_penalty if core_score is not None else 0.0,
        "qualitativeModifier": qual_modifier,
        "intermediateRaw": intermediate,
        "stackInput": stack_input,
        "softnessInput": softness_input,
        "qualitativeSignals": {
            "sourceCount": derived["stability"]["sourceCount"],
            "shares": derived["stability"]["shares"],
        },
    }
    return (
        stability_from_intermediate_v3(intermediate),
        raw_stability_from_intermediate_v3(intermediate),
        components,
        derived,
    )


def compute_durability_v3(sources: list[dict[str, Any]], existing_specs: dict[str, Any],
                          derived: dict[str, Any] | None = None) -> tuple[int, float, dict[str, Any], dict[str, Any]]:
    del existing_specs
    derived = derived or derive_signals(sources)
    rr_src = get_source(sources, "RunRepeat")
    rt_src = get_source(sources, "RTINGS")

    rr_attr = (rr_src or {}).get("attributeScores", {})
    rr_dur = rr_attr.get("durability", {}) or {}
    rr_misc = rr_attr.get("misc", {}) or {}
    rt_attr = (rt_src or {}).get("attributeScores", {})
    long_run = rt_attr.get("longRun", {}) or {}

    abrasion_mm = parse_mm(rr_dur.get("outsoleDurability"))
    thickness_mm = parse_mm(rr_dur.get("outsoleThickness"))
    if abrasion_mm is not None and thickness_mm is not None:
        outsole_score = durability_outsole_component(thickness_mm, abrasion_mm)
    elif abrasion_mm is not None:
        outsole_score = durability_outsole_from_abrasion_only(abrasion_mm)
    else:
        outsole_score = None

    upper_score = durability_upper_component(
        rr_dur.get("toeboxDurability"),
        rr_dur.get("heelPaddingDurability"),
    )

    retention_ratio = None
    if long_run.get("at10km_J") and long_run.get("at40km_J"):
        retention_ratio = float(long_run["at40km_J"]) / float(long_run["at10km_J"])
    midsole_score = durability_midsole_longevity_component(retention_ratio)
    midsole_modifier = durability_midsole_longevity_modifier(retention_ratio)
    compound_modifier = durability_compound_modifier(rr_misc.get("outsoleHardness_hc"))
    qual_modifier = derived["durability"]["modifierRaw"]
    intermediate = durability_intermediate_v3(
        outsole_score=outsole_score,
        upper_score=upper_score,
        midsole_longevity_score=midsole_score,
        midsole_longevity_modifier=midsole_modifier,
        compound_modifier=compound_modifier,
        qual_modifier=qual_modifier,
    )
    core_inputs = [
        (outsole_score, 0.60),
        (upper_score, 0.20),
    ]
    if MIDSOLE_LONGRUN_CORE_ENABLED:
        core_inputs.append((midsole_score, 0.20))
    core_score = weighted_mean_available(core_inputs)
    components = {
        "scoreVersion": SCORE_VERSION,
        "outsoleScore": outsole_score,
        "upperScore": upper_score,
        "midsoleLongevityScore": midsole_score,
        "midsoleLongevityMode": "core" if MIDSOLE_LONGRUN_CORE_ENABLED else "modifier",
        "midsoleLongevityModifier": midsole_modifier,
        "coreScore": round(core_score, 2) if core_score is not None else None,
        "compoundModifier": compound_modifier if core_score is not None else 0.0,
        "qualitativeModifier": qual_modifier,
        "intermediateRaw": intermediate,
        "inputs": {
            "abrasionMm": abrasion_mm,
            "outsoleThicknessMm": thickness_mm,
            "toeboxDurability": rr_dur.get("toeboxDurability"),
            "heelPaddingDurability": rr_dur.get("heelPaddingDurability"),
            "midsoleRetentionRatio": round(retention_ratio, 4) if retention_ratio is not None else None,
            "outsoleHardnessHc": rr_misc.get("outsoleHardness_hc"),
        },
        "qualitativeSignals": {
            "sourceCount": derived["durability"]["sourceCount"],
            "shares": derived["durability"]["shares"],
        },
    }
    return (
        durability_from_intermediate_v3(intermediate),
        raw_durability_from_intermediate_v3(intermediate),
        components,
        derived,
    )
