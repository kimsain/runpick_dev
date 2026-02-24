#!/usr/bin/env python3
"""기존 officialUrl → sources 객체로 마이그레이션.

RunRepeat/RTINGS/DOR URL만 sources에 복사. 브랜드 공식 URL은 skip.
"""
import json
import glob

def detect_source_key(url: str):
    if 'runrepeat.com' in url:
        return 'runrepeat'
    if 'rtings.com' in url:
        return 'rtings'
    if 'doctorsofrunning.com' in url:
        return 'dor'
    return None  # 브랜드 공식 URL → skip

for path in sorted(glob.glob('data/brands/*.json')):
    with open(path, encoding='utf-8') as f:
        data = json.load(f)

    changed = 0
    for shoe in data['shoes']:
        url = shoe.get('officialUrl', '')
        key = detect_source_key(url)
        if key and 'sources' not in shoe:
            shoe['sources'] = {key: url}
            changed += 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f"{path}: {changed}개 신발 업데이트")
