"""
scripts/analyze_imputation.py
Case B 신발의 물리 스펙 ↔ 점수 상관관계 분석.
실행: python scripts/analyze_imputation.py
"""
import json
import glob
import numpy as np
from scipy import stats

PLATE_CATS = {'full', 'full-plate', 'half', 'half-plate', 'light-plate', 'carbon-plate'}

PEBA_KEYWORDS = {'ZoomX', 'Lightstrike Pro', 'LightStrike Pro', 'FF TURBO+', 'FF TURBO²',
                 'PEBA', 'PWRRUN PB', 'Energy Foam', 'FuelCell', 'Propulsion Foam',
                 'Lightstrike Pro (A-TPU)', 'Lightstrike Pro Evo'}
EVA_KEYWORDS  = {'Gel', 'React', 'ReactX', 'Levitate', 'BioMoGo', 'DNA Loft', 'Fresh Foam',
                 'Dreamstrike+', 'Boost', 'GEL', 'PureGEL', 'FF BLAST+', 'FF BLAST MAX',
                 'FF BLAST PLUS', 'FF LEAP', 'FF BLAST'}

SUBCAT_GROUPS = {
    'racing':    {'full', 'full-plate', 'half', 'half-plate', 'light-plate', 'carbon-plate', 'no-plate', 'lightweight'},
    'stability': {'stability'},
    'cushion':   {'max-cushion'},
    'daily':     {'entry', 'all-rounder'},
}


def load_case_b_shoes():
    """rawCushioning과 rawStability가 모두 있는 신발만 수집 (Case B)"""
    shoes = []
    for f in sorted(glob.glob('data/brands/*.json')):
        with open(f) as fp:
            data = json.load(fp)
        for shoe in data.get('shoes', []):
            sp = shoe.get('specs', {})
            if sp.get('rawCushioning') is not None and sp.get('rawStability') is not None:
                shoes.append(shoe)
    return shoes


def get_foam_type(shoe):
    techs = set(shoe.get('technologies', []))
    if techs & PEBA_KEYWORDS:
        return 'peba'
    if techs & EVA_KEYWORDS:
        return 'eva'
    return 'other'


def get_subcat_group(shoe):
    subcat = shoe.get('subcategoryId', 'all-rounder')
    for group, cats in SUBCAT_GROUPS.items():
        if subcat in cats:
            return group
    return 'daily'


def extract_features(shoe):
    """
    Case B 신발 1개에서 상관분석용 feature를 추출한다.

    Returns:
        {feature_name: value, ...} — heel_stack, fore_stack, drop, weight,
        has_plate, foam_peba, foam_eva, group_racing, group_stability, group_cushion 포함.
    """
    sp = shoe.get('specs', {})
    sh = sp.get('stackHeight', {})
    foam = get_foam_type(shoe)
    group = get_subcat_group(shoe)
    subcat = shoe.get('subcategoryId', 'all-rounder')
    return {
        'heel_stack':    sh.get('heel', 0),
        'fore_stack':    sh.get('forefoot', 0),
        'drop':          sh.get('heel', 0) - sh.get('forefoot', 0),
        'weight':        sp.get('weight', 250),
        'has_plate':     int(subcat in PLATE_CATS),
        'foam_peba':     int(foam == 'peba'),
        'foam_eva':      int(foam == 'eva'),
        'group_racing':  int(group == 'racing'),
        'group_stability': int(group == 'stability'),
        'group_cushion': int(group == 'cushion'),
    }


def main():
    """
    Case B 신발(RunRepeat + RTINGS 모두 보유)을 대상으로
    각 feature와 점수 간 Pearson 상관계수를 계산해 출력한다.

    impute_scores.py의 ElasticNet 모델이 사용하는 feature의
    예측력을 검증하는 분석 스크립트.
    """
    shoes = load_case_b_shoes()
    print(f"Case B 신발 수: {len(shoes)}")

    # foam type distribution
    foam_counts = {'peba': 0, 'eva': 0, 'other': 0}
    for s in shoes:
        foam_counts[get_foam_type(s)] += 1
    print(f"Foam types in Case B: {foam_counts}")

    targets = ['cushioning', 'responsiveness', 'stability', 'durability']
    feature_names = ['heel_stack', 'fore_stack', 'drop', 'weight', 'has_plate',
                     'foam_peba', 'foam_eva', 'group_racing', 'group_stability', 'group_cushion']

    for target in targets:
        print(f"\n--- {target} 상관관계 ---")
        y = np.array([s['specs'][target] for s in shoes], dtype=float)
        print(f"  평균: {y.mean():.2f}  σ: {y.std():.2f}  범위: {int(y.min())}-{int(y.max())}")
        for feat in feature_names:
            x = np.array([extract_features(s)[feat] for s in shoes], dtype=float)
            if x.std() == 0:
                print(f"  {feat:20s}: 분산=0 (건너뜀)")
                continue
            r, p = stats.pearsonr(x, y)
            sig = '***' if p < 0.001 else ('**' if p < 0.01 else ('*' if p < 0.05 else ''))
            print(f"  {feat:20s}: r={r:+.3f}  p={p:.3f} {sig}")


if __name__ == '__main__':
    main()
