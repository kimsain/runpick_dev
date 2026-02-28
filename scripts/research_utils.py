"""research/ 디렉터리 탐색 유틸리티."""
import re
import sys
from pathlib import Path

RESEARCH_BASE = Path(__file__).parent.parent / "research"


def resolve_research_files(date_arg=None):
    """
    신발별 최신 연구 파일 경로 목록 반환.
    --date 지정 시: 해당 날짜 폴더만 (하위 호환).
    --date 미지정 시: 전체 날짜 폴더 스캔, 신발당 최신 파일 선택.
    """
    if date_arg:
        date_dirs = [RESEARCH_BASE / date_arg]
        if not date_dirs[0].is_dir():
            sys.exit(f"ERROR: {date_dirs[0]} 디렉터리 없음")
    else:
        date_dirs = sorted(
            [d for d in RESEARCH_BASE.iterdir()
             if d.is_dir() and re.match(r"\d{4}-\d{2}-\d{2}$", d.name)],
            key=lambda d: d.name,  # oldest first → newer overwrites
        )
        if not date_dirs:
            sys.exit("ERROR: research/ 에 YYYY-MM-DD 디렉터리 없음")

    by_shoe = {}  # shoe_id → Path
    for date_dir in date_dirs:
        for brand_dir in date_dir.iterdir():
            if not brand_dir.is_dir():
                continue
            for fpath in brand_dir.glob("*.json"):
                if fpath.name in ("batch-summary.json", "checkpoint.json"):
                    continue
                by_shoe[fpath.stem] = fpath

    return sorted(by_shoe.values(), key=lambda p: p.name)


def describe_date_range(date_arg=None):
    """로그용 날짜 범위 문자열."""
    if date_arg:
        return f"날짜: {date_arg}"
    date_dirs = sorted(
        d.name for d in RESEARCH_BASE.iterdir()
        if d.is_dir() and re.match(r"\d{4}-\d{2}-\d{2}$", d.name)
    )
    if len(date_dirs) <= 1:
        return f"날짜: {date_dirs[0]}" if date_dirs else "날짜 없음"
    return f"전체 병합: {date_dirs[0]} ~ {date_dirs[-1]} ({len(date_dirs)}개)"
