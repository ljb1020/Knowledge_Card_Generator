export const CARD_EXPORT_WIDTH = 1080;
export const CARD_EXPORT_HEIGHT = 1440;

export const CARD_STYLE_VERSION = 'frontend-card-v1' as const;
export const DEFAULT_GENERATED_CARD_COUNT = 4 as const;

export const JOB_HISTORY_LIMIT = 20;

export const VALIDATION_RULES = {
  cover: {
    titleMax: 28,
    subtitleMax: 90,
    tag: '前端面试卡',
  },
  bullet: {
    titleMax: 28,
    bulletsMin: 3,
    bulletsMax: 6,
    bulletMax: 220,
  },
  cardMin: 4,
  cardMax: 4,
} as const;
