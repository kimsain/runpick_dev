// Confidence level design tokens - single source of truth
// CONF_COLORS: combined badge classes (text + bg/20) for badge containers
// CONF_TEXT / CONF_DOT: split classes for ShoeCard's separate text and dot elements

export const CONF_COLORS: Record<string, string> = {
  'very-high': 'text-conf-very-high bg-conf-very-high/20',
  'high':      'text-conf-high bg-conf-high/20',
  'medium':    'text-conf-medium bg-conf-medium/20',
  'low':       'text-conf-low bg-conf-low/20',
}

export const CONF_TEXT: Record<string, string> = {
  'very-high': 'text-conf-very-high',
  'high':      'text-conf-high',
  'medium':    'text-conf-medium',
  'low':       'text-conf-low',
}

export const CONF_DOT: Record<string, string> = {
  'very-high': 'bg-conf-very-high',
  'high':      'bg-conf-high',
  'medium':    'bg-conf-medium',
  'low':       'bg-conf-low',
}

export const CONF_LABELS: Record<string, string> = {
  'very-high': '매우 높음',
  'high':      '높음',
  'medium':    '보통',
  'low':       '낮음',
}
