import { z } from 'zod';
import { DEFAULT_GENERATED_CARD_COUNT, VALIDATION_RULES } from '../constants/index.js';

export const CoverCardSchema = z.object({
  id: z.string(),
  type: z.literal('cover'),
  title: z.string().max(VALIDATION_RULES.cover.titleMax),
  subtitle: z.string().max(VALIDATION_RULES.cover.subtitleMax),
  tag: z.literal(VALIDATION_RULES.cover.tag),
});

export const BulletCardSchema = z.object({
  id: z.string(),
  type: z.literal('bullet'),
  title: z.string().max(VALIDATION_RULES.bullet.titleMax),
  bullets: z
    .array(z.string().max(VALIDATION_RULES.bullet.bulletMax))
    .min(VALIDATION_RULES.bullet.bulletsMin)
    .max(VALIDATION_RULES.bullet.bulletsMax),
});

export const CardSchema = z.union([CoverCardSchema, BulletCardSchema]);

export const CardDocumentSchema = z.object({
  topic: z.string(),
  styleVersion: z.literal('frontend-card-v1'),
  cards: z
    .array(CardSchema)
    .length(DEFAULT_GENERATED_CARD_COUNT, `卡片总数必须为 ${DEFAULT_GENERATED_CARD_COUNT} 张`)
    .refine((cards) => cards[0]?.type === 'cover', {
      message: '第 1 张卡必须是 cover',
    })
    .refine((cards) => cards.slice(1).every((card) => card.type === 'bullet'), {
      message: '第 2 到第 4 张卡必须都是 bullet',
    }),
});

export const JobStatusSchema = z.enum([
  'generating',
  'validating',
  'ready',
  'ready_with_warnings',
  'exporting',
  'done',
  'failed',
]);

export const GenerateRequestSchema = z.object({
  topic: z.string().min(1).max(100),
});
