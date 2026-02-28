"""
scripts/impute_scores.py

Case B 68개를 이웃 데이터로 Foam-calibrated Subcategory KNN Median 구축.
LOOCV로 검증 후 Case C(6개, 측정값 없음)와 Case A 안정성/내구성(12개)에 적용.

사용법:
  python scripts/impute_scores.py --analyze    # LOOCV 검증만
  python scripts/impute_scores.py --preview    # Case C/A 예측 미리보기
  python scripts/impute_scores.py --apply      # JSON에 실제 적용

설계 결정 (2026-02-25 Codex+Gemini 토론 합의):
- ElasticNetCV → Foam-calibrated KNN Median으로 교체
  이유: n=6에 전역 ML 불필요; 현재 100% category mean fallback 동작 중
- foam_class 4단계: peba/supercritical/standard_eva/unknown (한글 tech명 포함)
- 안정성/내구성: 최종 정수 점수 중앙값 직접 적용 (역산 복합 오차 방지)
- 쿠션성/반응성: rawCushioning/rawResponsiveness 중앙값
- ±2 하드 보호 제거 → ±3 소프트 경고 (모델이 신뢰성 있을 때 보호가 방해됨)
- sklearn 제거 (numpy만 사용)
"""
from __future__ import annotations
import json
import glob
import argparse
import numpy as np

# ── 상수 ──────────────────────────────────────────────────────────────────────

# foam_class 우선순위 매핑 (2026-02-25 토론 합의)
# 한글 tech명 포함 — technologies 필드 실측값 기준
FOAM_MAP: dict[str, str] = {
    # ── PEBA (최고 반발 — 경쟁용 슈퍼폼) ──────────────────────────────
    'ZoomX': 'peba', 'ZoomX (PEBA)': 'peba',
    'Lightstrike Pro': 'peba', 'Lightstrike Pro (A-TPU)': 'peba',
    'Lightstrike Pro Evo': 'peba',
    'FF TURBO+': 'peba', 'FF TURBO²': 'peba',
    'Dreamstrike+': 'peba',
    '고반발 슈퍼폼': 'peba',   # PEBA급 슈퍼폼 (NITRO Elite 등)
    '슈퍼폼 미드솔': 'peba',
    # ── Supercritical EVA (고반발 훈련화급) ──────────────────────────
    'FF BLAST+': 'supercritical', 'FF BLAST MAX': 'supercritical',
    'FF BLAST PLUS': 'supercritical', 'FF LEAP': 'supercritical',
    'SR-02': 'supercritical',          # ASICS FF BLAST 계열
    '고반발 미드솔': 'supercritical',  # ASICS 한글 (FF BLAST+ 계열)
    '고반발 폼': 'supercritical',      # PUMA NITROFOAM 계열
    '반발형 폼': 'supercritical',
    # ── Standard EVA (일반 훈련화급) ────────────────────────────────
    'ReactX': 'standard_eva', 'Air Zoom': 'standard_eva',
    'Cushlon 3.0': 'standard_eva',
    'PureGEL': 'standard_eva', 'FlyteFoam': 'standard_eva',
    'Fresh Foam X': 'standard_eva',
    'BioMoGo DNA': 'standard_eva', 'DNA Loft v3': 'standard_eva',
    'Lightstrike 2.0': 'standard_eva', 'Lightstrike': 'standard_eva',
    'FF BLAST': 'standard_eva',
    '맥스 쿠셔닝 폼': 'standard_eva',  # HOKA 계열 두꺼운 EVA
    '쿠셔닝 폼': 'standard_eva',
    '균형형 쿠셔닝 폼': 'standard_eva',
    '경량 미드솔': 'standard_eva',
}

FOAM_PRIORITY = {'peba': 3, 'supercritical': 2, 'standard_eva': 1, 'unknown': 0}

SUBCAT_GROUPS = {
    'racing':    {'full', 'full-plate', 'half', 'half-plate', 'light-plate', 'carbon-plate', 'no-plate', 'lightweight'},
    'stability': {'stability'},
    'cushion':   {'max-cushion'},
    'daily':     {'entry', 'all-rounder'},
}

TARGETS = ['cushioning', 'responsiveness', 'stability', 'durability']

# 합격 기준
MAE_THRESHOLD = 1.0
MAX_AE_THRESHOLD = 1.5

# ── 헬퍼 ──────────────────────────────────────────────────────────────────────

def get_foam_class(shoe: dict) -> str:
    """technologies 리스트에서 최고 우선순위 foam_class 반환.
    PEBA > supercritical > standard_eva > unknown
    """
    best = 'unknown'
    for tech in shoe.get('technologies', []):
        fc = FOAM_MAP.get(tech, 'unknown')
        if FOAM_PRIORITY[fc] > FOAM_PRIORITY[best]:
            best = fc
    return best


def get_subcat_group(shoe: dict) -> str:
    subcat = shoe.get('subcategoryId', 'all-rounder')
    for group, cats in SUBCAT_GROUPS.items():
        if subcat in cats:
            return group
    return 'daily'


# ── 데이터 로딩 ───────────────────────────────────────────────────────────────

def load_all_shoes():
    shoes = []
    for f in sorted(glob.glob('data/brands/*.json')):
        with open(f) as fp:
            data = json.load(fp)
        for shoe in data.get('shoes', []):
            shoe['_file'] = f
            shoes.append(shoe)
    return shoes


def is_case_b(shoe: dict) -> bool:
    sp = shoe.get('specs', {})
    return sp.get('rawCushioning') is not None and sp.get('rawStability') is not None


def is_case_a(shoe: dict) -> bool:
    """RTINGS 있지만 rawStability 없음"""
    sp = shoe.get('specs', {})
    return sp.get('rawCushioning') is not None and sp.get('rawStability') is None


def is_case_c(shoe: dict) -> bool:
    sp = shoe.get('specs', {})
    return sp.get('rawCushioning') is None


# ── KNN Median 핵심 함수 ──────────────────────────────────────────────────────

def find_neighbors(shoe: dict, case_b_shoes: list, min_k: int = 3) -> tuple[list, str]:
    """Foam-calibrated subcat 그룹 매칭. 3단계 fallback.

    Returns (neighbor_list, tier_label)
    """
    sg = get_subcat_group(shoe)
    fc = get_foam_class(shoe)

    # Tier 1: 같은 subcat_group + foam_class
    t1 = [s for s in case_b_shoes
          if get_subcat_group(s) == sg and get_foam_class(s) == fc]
    if len(t1) >= min_k:
        return t1, f'tier1({sg}+{fc})'

    # Tier 2: 같은 subcat_group만
    t2 = [s for s in case_b_shoes if get_subcat_group(s) == sg]
    if len(t2) >= 2:
        return t2, f'tier2({sg})'

    # Tier 3: 전체 Case B
    return case_b_shoes, 'tier3(global)'


def impute_int(neighbors: list, dim: str) -> int:
    """neighbors의 dim 점수 중앙값 → 정수."""
    vals = [s['specs'][dim] for s in neighbors if s['specs'].get(dim) is not None]
    return int(round(float(np.median(vals))))


def impute_raw(neighbors: list, raw_dim: str) -> float | None:
    """neighbors의 raw_dim 중앙값 → float (소수점 2자리). 없으면 None."""
    vals = [s['specs'][raw_dim] for s in neighbors
            if s['specs'].get(raw_dim) is not None]
    if not vals:
        return None
    return round(float(np.median(vals)), 2)


# ── LOOCV 검증 ────────────────────────────────────────────────────────────────

def loocv_validate_knn(case_b_shoes: list, dim: str) -> tuple[float, float, list]:
    """KNN Median LOOCV — Case B 신발 하나씩 제외 후 나머지로 예측."""
    preds = []
    actuals = []
    for i, shoe in enumerate(case_b_shoes):
        leave_out = case_b_shoes[:i] + case_b_shoes[i+1:]
        neighbors, _ = find_neighbors(shoe, leave_out, min_k=3)
        pred = impute_int(neighbors, dim)
        actual = shoe['specs'].get(dim)
        if actual is not None:
            preds.append(pred)
            actuals.append(actual)
    mae = float(np.mean([abs(p - a) for p, a in zip(preds, actuals)]))
    max_ae = float(max(abs(p - a) for p, a in zip(preds, actuals)))
    return mae, max_ae, preds


# ── 적용 ──────────────────────────────────────────────────────────────────────

def _apply_changes(changes: list):
    """변경사항을 data/brands/*.json에 적용."""
    # id → (fpath, data) 매핑
    file_map = {}
    for f in glob.glob('data/brands/*.json'):
        with open(f) as fp:
            data = json.load(fp)
        for shoe in data.get('shoes', []):
            file_map[shoe['id']] = (f, data)

    # 수정
    for row in changes:
        sid = row['id']
        if sid not in file_map:
            print(f"  경고: {sid} not found in data files")
            continue
        fpath, data = file_map[sid]
        for shoe in data['shoes']:
            if shoe['id'] == sid:
                for k, v in row.items():
                    if isinstance(v, dict) and 'predicted' in v:
                        shoe['specs'][k] = v['predicted']
                    elif k in ('rawCushioning', 'rawResponsiveness', 'rawStability', 'rawDurability') and v is not None:
                        shoe['specs'][k] = v

    # 저장 (파일별로 한 번씩)
    saved = set()
    for sid, (fpath, data) in file_map.items():
        if fpath not in saved:
            with open(fpath, 'w') as fp:
                json.dump(data, fp, ensure_ascii=False, indent=2)
            saved.add(fpath)


# ── 메인 ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Statistical imputation for RunPick shoes')
    parser.add_argument('--analyze', action='store_true', help='LOOCV 검증만 실행')
    parser.add_argument('--preview', action='store_true', help='Case C/A 예측 미리보기 (적용 안함)')
    parser.add_argument('--apply',   action='store_true', help='JSON에 실제 적용')
    parser.add_argument('--shoe-id', metavar='ID', help='특정 신발만 처리')
    args = parser.parse_args()

    if not any([args.analyze, args.preview, args.apply]):
        parser.print_help()
        return

    all_shoes = load_all_shoes()
    case_b = [s for s in all_shoes if is_case_b(s)]
    case_a = [s for s in all_shoes if is_case_a(s)]
    case_c = [s for s in all_shoes if is_case_c(s)]

    if args.shoe_id:
        case_a = [s for s in case_a if s['id'] == args.shoe_id]
        case_c = [s for s in case_c if s['id'] == args.shoe_id]

    print(f"Case B: {len(case_b)}개 (훈련), Case A: {len(case_a)}개, Case C: {len(case_c)}개")

    # ── LOOCV 검증 ──────────────────────────────────────────────────────────
    if args.analyze:
        print("\n===== KNN Median LOOCV 검증 결과 =====")
        all_pass = True
        for target in TARGETS:
            mae, max_ae, _ = loocv_validate_knn(case_b, target)
            pass_mae   = mae    <= MAE_THRESHOLD
            pass_maxae = max_ae <= MAX_AE_THRESHOLD
            ok = "✓" if (pass_mae and pass_maxae) else "✗"
            print(f"  {target:15s}: MAE={mae:.3f}  MaxAE={max_ae:.3f}  {ok}")
            if not (pass_mae and pass_maxae):
                all_pass = False
        print("\n✓ 개선 확인" if all_pass else "\n! 일부 차원 기준 미달 (fallback: Tier2/3 중앙값)")
        return

    # ── KNN Median 예측 ─────────────────────────────────────────────────────
    SOFT_WARN_DELTA = 3   # 이 이상 차이 시 경고 (하드 보호 없음)
    changes = []
    warnings = []

    # Case C: cushioning + responsiveness + stability + durability 전부
    for shoe in case_c:
        neighbors, tier = find_neighbors(shoe, case_b)
        row = {'id': shoe['id'], 'case': 'C', 'tier': tier}
        for t in TARGETS:
            cur  = shoe['specs'].get(t)
            pred = impute_int(neighbors, t)
            row[t] = {'current': cur, 'predicted': pred}
            if cur is not None and abs(pred - cur) >= SOFT_WARN_DELTA:
                warnings.append({'id': shoe['id'], 'dim': t, 'current': cur, 'predicted': pred})
        # raw 점수도 설정
        for raw_dim in ['rawCushioning', 'rawResponsiveness', 'rawStability', 'rawDurability']:
            row[raw_dim] = impute_raw(neighbors, raw_dim)
        changes.append(row)

    # Case A: stability + durability만 (cush/resp는 이미 RTINGS 공식으로 산출)
    for shoe in case_a:
        neighbors, tier = find_neighbors(shoe, case_b)
        row = {'id': shoe['id'], 'case': 'A', 'tier': tier}
        for t in ['stability', 'durability']:
            cur  = shoe['specs'].get(t)
            pred = impute_int(neighbors, t)
            row[t] = {'current': cur, 'predicted': pred}
        row['rawStability'] = impute_raw(neighbors, 'rawStability')
        row['rawDurability'] = impute_raw(neighbors, 'rawDurability')
        changes.append(row)

    # ── 미리보기 출력 ─────────────────────────────────────────────────────────
    if args.preview or args.apply:
        print("\n===== KNN Median 예측 결과 =====")
        for row in changes:
            print(f"\n  {row['id']} (Case {row['case']}, {row['tier']})")
            for k, v in row.items():
                if isinstance(v, dict) and 'predicted' in v:
                    cur_str = str(v['current']) if v['current'] is not None else 'None'
                    diff    = v['predicted'] - (v['current'] or 0)
                    sign    = f"+{diff}" if diff >= 0 else str(diff)
                    print(f"    {k:15s}: {cur_str:>4} → {v['predicted']}  ({sign})")

    if warnings:
        print(f"\n===== 소프트 경고 (|delta| ≥ {SOFT_WARN_DELTA}) =====")
        for w in warnings:
            print(f"  {w['id']:30s} {w['dim']:15s}: {w['current']} → {w['predicted']}")

    if args.apply:
        _apply_changes(changes)
        print(f"\n✓ {len(changes)}개 신발 데이터 업데이트 완료")
        print("  다음 단계: python scripts/recalculate.py --apply")


if __name__ == '__main__':
    main()
