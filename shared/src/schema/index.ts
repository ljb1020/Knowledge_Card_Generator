import { z } from 'zod';

export const CoverCardSchema = z.object({
  id: z.string(),
  type: z.literal('cover'),
  title: z.string().max(24),
  subtitle: z.string().max(40),
  tag: z.literal('前端知识点'),
});

export const BulletCardSchema = z.object({
  id: z.string(),
  type: z.literal('bullet'),
  title: z.string().max(22),
  bullets: z.array(z.string().max(30)).min(2).max(4),
});

export const SummaryCardSchema = z.object({
  id: z.string(),
  type: z.literal('summary'),
  title: z.string().max(22),
  summary: z.string().max(80),
  cta: z.string().max(24),
});

export const CardSchema = z.union([CoverCardSchema, BulletCardSchema, SummaryCardSchema]);

export const CardDocumentSchema = z.object({
  topic: z.string(),
  styleVersion: z.literal('frontend-card-v1'),
  cards: z.array(CardSchema).refine(
    (cards) => cards.length >= 4 && cards.length <= 8,
    { message: '卡片总数必须在 4~8 之间' }
  ).refine(
    (cards) => cards[0]?.type === 'cover',
    { message: '第一页必须是 cover' }
  ).refine(
    (cards) => cards[cards.length - 1]?.type === 'summary',
    { message: '最后一页必须是 summary' }
  ).refine(
    (cards) => cards.slice(1, -1).every((c) => c.type === 'bullet'),
    { message: '中间页只能是 bullet' }
  ),
});

export const JobStatusSchema = z.enum([
  'generating',
  'validating',
  'ready',
  'exporting',
  'done',
  'failed',
]);

export const GenerateRequestSchema = z.object({
  topic: z.string().min(1).max(100),
});
