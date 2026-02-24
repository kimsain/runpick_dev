import json, glob

FIXES = {
    'supernova-rise-3': 'low',
    'adizero-sl-2': 'very-high',
    'arahi-8': 'high',
    'fresh-foam-x-880v15': 'very-high',
    'fresh-foam-x-1080v15': 'very-high',
    'fresh-foam-x-more-v6': 'very-high',
    'fuelcell-rebel-v5': 'very-high',
    'fuelcell-sc-elite-v5': 'very-high',
    'deviate-nitro-4': 'medium',
    'deviate-nitro-elite-4': 'medium',
    'tempus-2': 'very-high',
    'endorphin-azura': 'high',
    'endorphin-pro-4': 'very-high',
    'endorphin-pro-5': 'high',
}

for path in sorted(glob.glob('data/brands/*.json')):
    data = json.load(open(path, encoding='utf-8'))
    changed = 0
    for shoe in data['shoes']:
        if shoe['slug'] in FIXES:
            shoe['confidence'] = FIXES[shoe['slug']]
            changed += 1
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f"{path}: {changed}개 수정")
