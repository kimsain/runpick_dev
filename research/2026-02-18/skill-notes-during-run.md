# codex_2 Run Skill Notes

- run_date: 2026-02-18
- total_shoes: 88
- generated_at: 2026-02-17T12:02:11.877Z

## Observed Signals
- RunRepeat missing_url: 0
- RunRepeat parse_bug_forefoot_missing: 0
- RTINGS missing_core_metrics: 0
- RTINGS missing_rendered_ER: 0
- RTINGS suspicious_low_ER(<20%): 0
- RTINGS ultralight weights(<120g): 0
- RTR missing_url: 34
- BITR missing_url: 31
- soft-404 accepted: 1
- soft-404 rejected: 11

## Candidate Additions To Skill
- RTR/BITR에서 `http>=400` + 모델일치 + 본문존재 케이스를 공식 `soft_404_body` 상태로 확장 검토 (현재는 found reason 처리)
- RTR URL 탐색은 guessed slug 2~3개에서 멈추고, 브랜드별 월별 sitemap 인덱스 기반 탐색을 1회 추가하는 보강 규칙 검토

## Brand Source Health Snapshot
- adidas: RunRepeat(found 7, not_found 4), RTINGS(found 8, partial 0)
- asics: RunRepeat(found 11, not_found 1), RTINGS(found 12, partial 0)
- brooks: RunRepeat(found 7, not_found 4), RTINGS(found 10, partial 0)
- diadora: RunRepeat(found 0, not_found 0), RTINGS(found 1, partial 0)
- hoka: RunRepeat(found 5, not_found 3), RTINGS(found 6, partial 0)
- mizuno: RunRepeat(found 6, not_found 3), RTINGS(found 9, partial 0)
- new-balance: RunRepeat(found 1, not_found 5), RTINGS(found 4, partial 0)
- nike: RunRepeat(found 10, not_found 2), RTINGS(found 10, partial 0)
- puma: RunRepeat(found 6, not_found 4), RTINGS(found 7, partial 0)
- saucony: RunRepeat(found 7, not_found 0), RTINGS(found 8, partial 0)

## Global Summary
- confidence_distribution: high=60, medium=21, low=7
- low_rate: 0.08

