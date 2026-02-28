#!/usr/bin/env python3
"""
fetch_reviews.py — 정성리뷰 자동 수집 스크립트

DOR / RTR / BITR URL에서 Playwright로 기사 본문을 추출한다.
출력 JSON의 rawText를 Codex(ai-team MCP)에 전달해 keyFindings를 얻는다.

사용:
    python3 scripts/fetch_reviews.py --fetch URL --shoe-id ID
    python3 scripts/fetch_reviews.py --extract URL   # 본문만 stdout 출력 (디버그)

참고: fetch_runrepeat.py / fetch_rtings.py 와 동일한 CLI 패턴.
"""
import argparse
import json
import re
import sys
from datetime import date
from urllib.parse import urlparse

from playwright.sync_api import TimeoutError as PWTimeoutError, sync_playwright

# 사이트별 (source_key, source_name, selectors, wait_ms)
# 선택자 우선순위: 앞에서부터 시도, 가장 긴 텍스트가 나오는 첫 번째 항목 사용
SITE_CONFIG = {
    "doctorsofrunning.com": (
        "dor", "Doctors of Running",
        [".post-body", ".entry-content", "#main"],
        2000,
    ),
    "roadtrailrun.com": (
        "rtr", "Road Trail Run",
        [".post-body", ".entry-content", "#main"],
        3000,
    ),
    "believeintherun.com": (
        "bitr", "Believe in the Run",
        ["body"],
        3000,
    ),
}

# Codex에 전달할 텍스트 최대 길이 (토큰 절감)
MAX_TEXT_CHARS = 12000


def detect_source(url: str):
    """URL 도메인으로 소스 감지. 반환: (key, name, selectors, wait_ms) 또는 None."""
    host = (urlparse(url).hostname or "").lower()
    for domain, config in SITE_CONFIG.items():
        if host == domain or host.endswith("." + domain):
            return config
    return None


def fetch_article_text(url: str, selectors: list, wait_ms: int) -> str:
    """Playwright로 URL 렌더 후 선택자로 본문 텍스트 추출.

    선택자 중 가장 긴 텍스트를 반환. 모두 빈 문자열이면 빈 문자열 반환.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            extra_http_headers={"User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )}
        )
        page.goto(url, wait_until="domcontentloaded", timeout=45000)
        if wait_ms:
            page.wait_for_timeout(wait_ms)

        best = ""
        for sel in selectors:
            try:
                raw = page.locator(sel).first.inner_text(timeout=3000)
                if len(raw) > len(best):
                    best = raw
            except PWTimeoutError:
                continue

        browser.close()

    return clean_text(best)


def clean_text(raw: str) -> str:
    """연속 공백/줄바꿈 정리."""
    text = re.sub(r"\n{3,}", "\n\n", raw)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


def truncate_at_word(text: str, max_chars: int) -> tuple:
    """단어 경계에서 잘라 (truncated_text, was_truncated) 반환."""
    if len(text) <= max_chars:
        return text, False
    cut = text[:max_chars].rsplit(None, 1)[0]  # 마지막 공백 기준
    return cut, True


def main():
    parser = argparse.ArgumentParser(description="정성리뷰 기사 본문 수집")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--fetch", metavar="URL", help="수집 후 JSON 출력")
    group.add_argument("--extract", metavar="URL", help="본문 텍스트만 stdout 출력 (디버그)")
    parser.add_argument("--shoe-id", metavar="ID", help="출력 JSON에 포함할 신발 ID")
    args = parser.parse_args()

    url = args.fetch or args.extract
    config = detect_source(url)
    if config is None:
        print(f"[ERROR] 지원하지 않는 사이트: {url}", file=sys.stderr)
        print("지원: doctorsofrunning.com, roadtrailrun.com, believeintherun.com", file=sys.stderr)
        sys.exit(1)

    source_key, source_name, selectors, wait_ms = config

    try:
        text = fetch_article_text(url, selectors, wait_ms)
    except Exception as e:
        print(f"[ERROR] 페이지 로드 실패: {e}", file=sys.stderr)
        sys.exit(1)

    if not text:
        print("[ERROR] 본문 텍스트 추출 실패 — 선택자를 확인하세요", file=sys.stderr)
        sys.exit(1)

    if args.extract:
        print(text)
        return

    fetch_mode(text, url, source_key, source_name, args.shoe_id)


def fetch_mode(text: str, url: str, source_key: str, source_name: str, shoe_id: str):
    """구조화 JSON 출력 (Codex 전달용 중간 산출물)."""
    truncated_text, was_truncated = truncate_at_word(text, MAX_TEXT_CHARS)
    word_count = len(text.split())

    output = {
        "shoeId": shoe_id or "",
        "url": url,
        "source_key": source_key,
        "source": source_name,
        "fetch_date": str(date.today()),
        "fetch_method": "playwright_article",
        "word_count": word_count,
        "truncated": was_truncated,
        "rawText": truncated_text,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
