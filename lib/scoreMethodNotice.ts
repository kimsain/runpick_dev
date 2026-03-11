export interface ScoreMethodNoticeContent {
  label: string
  title: string
  description: string
}

export const STABILITY_METHOD_NOTICE: ScoreMethodNoticeContent = {
  label: '개발 중',
  title: '안정성 점수 로직은 현재 개발 중입니다',
  description:
    '현재 참고용으로 제공되며, 데이터와 로직 보정에 따라 추후 점수가 조정될 수 있습니다.',
}
