export const CATEGORY_LABELS: Record<string, string> = {
  daily: '데일리',
  'super-trainer': '슈퍼트레이너',
  racing: '레이싱',
}

export const CATEGORIES = [
  { id: 'all', label: '전체' },
  ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
]

export const SPEC_LABELS: Record<string, string> = {
  cushioning: '쿠션성',
  responsiveness: '반응성',
  stability: '안정성',
  durability: '내구성',
  weightScore: '경량성',
  valueScore: '가성비',
}

export const SOURCE_LABELS: Record<string, string> = {
  runrepeat: 'RunRepeat',
  rtings: 'RTINGS',
  dor: 'Doctors of Running',
  rtr: 'Road Trail Run',
  bitr: 'Believe in the Run',
}
