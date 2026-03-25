import {
  CARD_STYLE_VERSION,
  CardDocumentSchema,
  VALIDATION_RULES,
  type CardDocument,
  generateId,
} from 'shared';
import { ZodError, ZodIssueCode } from 'zod';
import { createChatCompletion } from '../llm/minimaxClient.js';
import {
  buildRepairPrompt,
  buildStage1Prompt,
  buildStage1RetryPrompt,
  buildStage2Prompt,
  buildStage2RetryPrompt,
} from '../prompts/generateDocument.js';
import { validateCardCoverage } from './validateCardCoverage.js';
import { validateTutorialDraft } from './validateTutorialDraft.js';
import type { ParsedTutorialDraft } from './tutorialDraft.js';

interface GenerateDocumentSuccess {
  success: true;
  stage1Draft: string;
  stage2Raw: string;
  documentJson: CardDocument;
  warningMessage: string | null;
  finalStatus: 'ready' | 'ready_with_warnings';
}

interface GenerateDocumentFailure {
  success: false;
  stage1Draft: string | null;
  stage2Raw: string | null;
  errorMessage: string;
}

export type GenerateDocumentResult = GenerateDocumentSuccess | GenerateDocumentFailure;

const FIXED_BULLET_TITLES = ['完整面试回答', '高频追问', '易错点'] as const;

type ProgressStatus = 'generating' | 'validating';

interface GenerateProgressUpdate {
  status: ProgressStatus;
  message: string;
}

interface GenerateDocumentOptions {
  onProgress?: (update: GenerateProgressUpdate) => void | Promise<void>;
  /** Provider ID to use (e.g. 'minimax', 'deepseek'). Defaults to 'minimax'. */
  modelId?: string;
}

function getStageModel(stage: 'stage1' | 'stage2'): string | undefined {
  if (stage === 'stage1') {
    return process.env.LLM_STAGE1_MODEL?.trim() || process.env.LLM_MODEL?.trim() || undefined;
  }

  return process.env.LLM_STAGE2_MODEL?.trim() || process.env.LLM_MODEL?.trim() || undefined;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Stage 2 / JSON 解析 / 模型输出中没有找到合法的 JSON 对象');
  }

  return trimmed.slice(start, end + 1);
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(/<[^>]+>/g, '')
    .replace(/```/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripAnswerBulletLeadLabel(value: string): string {
  return value.replace(
    /^\s*(?:定义|关键论据|总结|答题结构|回答思路|第一点|第二点|第三点|第[一二三四五六七八九十]点)\s*[：:]\s*/u,
    ''
  );
}

function normalizeCard(card: Record<string, unknown>): Record<string, unknown> {
  const type = card.type;
  const id = typeof card.id === 'string' && card.id.trim() ? card.id : generateId();

  if (type === 'cover') {
    return {
      id,
      type,
      title: normalizeText(card.title),
      subtitle: normalizeText(card.subtitle),
      tag: VALIDATION_RULES.cover.tag,
    };
  }

  if (type === 'bullet') {
    return {
      id,
      type,
      title: normalizeText(card.title),
      bullets: Array.isArray(card.bullets) ? card.bullets.map(normalizeText).filter(Boolean) : [],
    };
  }

  return {
    ...card,
    id,
  };
}

function normalizeDocument(topic: string, rawValue: unknown): Record<string, unknown> {
  const source = (rawValue ?? {}) as Record<string, unknown>;
  const rawCards = Array.isArray(source.cards) ? source.cards : [];

  return {
    topic,
    styleVersion: CARD_STYLE_VERSION,
    cards: rawCards.map((card, index) => {
      const normalizedCard = normalizeCard((card ?? {}) as Record<string, unknown>);
      if (
        index === 1 &&
        normalizedCard.type === 'bullet' &&
        Array.isArray((normalizedCard as { bullets?: unknown }).bullets)
      ) {
        return {
          ...normalizedCard,
          title: FIXED_BULLET_TITLES[0],
          bullets: ((normalizedCard as { bullets: unknown[] }).bullets as string[]).map((bullet: string) =>
            stripAnswerBulletLeadLabel(bullet)
          ),
        };
      }

      if (
        normalizedCard.type === 'bullet' &&
        index >= 2 &&
        index <= 3
      ) {
        return {
          ...normalizedCard,
          title: FIXED_BULLET_TITLES[index - 1],
        };
      }

      return normalizedCard;
    }),
  };
}

function containsDisallowedText(value: string): boolean {
  return /<[^>]+>|```|\p{Extended_Pictographic}/u.test(value);
}

function validateContentRules(document: CardDocument): { hardErrors: string[] } {
  const hardErrors: string[] = [];

  document.cards.forEach((card, index) => {
    const prefix = `Stage 2 / cards[${index}]`;
    if (containsDisallowedText(card.title)) {
      hardErrors.push(`${prefix}.title / 含有不允许出现的标记内容`);
    }

    if (card.type === 'cover') {
      if (containsDisallowedText(card.subtitle)) {
        hardErrors.push(`${prefix}.subtitle / 含有不允许出现的标记内容`);
      }
      return;
    }

    card.bullets.forEach((bullet, bulletIndex) => {
      if (containsDisallowedText(bullet)) {
        hardErrors.push(`${prefix}.bullets[${bulletIndex}] / 含有不允许出现的标记内容`);
      }
    });
  });

  return { hardErrors };
}

function formatIssuePath(path: (string | number)[]): string {
  return path.length > 0 ? path.join('.') : 'document';
}

function formatZodIssue(issue: ZodError['issues'][number]): string {
  const target = formatIssuePath(issue.path);

  if (issue.code === ZodIssueCode.invalid_type) {
    return `${target} 类型不正确`;
  }

  if (issue.code === ZodIssueCode.invalid_literal) {
    return `${target} 的值不符合要求`;
  }

  if (issue.code === ZodIssueCode.too_small) {
    if (issue.type === 'array') {
      return `${target} 数量不能少于 ${issue.minimum}`;
    }
    if (issue.type === 'string') {
      return `${target} 长度不能少于 ${issue.minimum}`;
    }
    return `${target} 不能小于 ${issue.minimum}`;
  }

  if (issue.code === ZodIssueCode.too_big) {
    if (issue.type === 'array') {
      return `${target} 数量不能超过 ${issue.maximum}`;
    }
    if (issue.type === 'string') {
      return `${target} 长度不能超过 ${issue.maximum}`;
    }
    return `${target} 不能超过 ${issue.maximum}`;
  }

  if (issue.code === ZodIssueCode.invalid_union) {
    return `${target} 不符合允许的结构类型`;
  }

  return `${target}：${issue.message}`;
}

function formatZodErrors(error: ZodError): string {
  return error.issues.map((issue) => `Stage 2 / Schema / ${formatZodIssue(issue)}`).join('\n');
}

function joinWarnings(warnings: string[]): string | null {
  const normalized = warnings.map((item) => item.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join('\n') : null;
}

function parseAndValidateDocument(
  topic: string,
  parsedDraft: ParsedTutorialDraft,
  raw: string
): { documentJson: CardDocument; warnings: string[] } | { errorMessage: string } {
  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as unknown;
    const normalized = normalizeDocument(topic, parsed);
    const validated = CardDocumentSchema.parse(normalized);
    const contentValidation = validateContentRules(validated);
    const coverageValidation = validateCardCoverage(topic, validated, parsedDraft);
    const hardErrors = [...contentValidation.hardErrors, ...coverageValidation.hardErrors];

    if (hardErrors.length > 0) {
      return { errorMessage: hardErrors.join('\n') };
    }

    return { documentJson: validated, warnings: coverageValidation.warnings };
  } catch (err) {
    if (err instanceof ZodError) {
      return { errorMessage: formatZodErrors(err) };
    }

    return { errorMessage: err instanceof Error ? err.message : String(err) };
  }
}

export async function generateDocumentForTopic(topic: string): Promise<GenerateDocumentResult> {
  return generateDocumentForTopicWithOptions(topic, {});
}

export async function generateDocumentForTopicWithOptions(
  topic: string,
  options: GenerateDocumentOptions = {}
): Promise<GenerateDocumentResult> {
  let stage1Draft: string | null = null;
  let stage2Raw: string | null = null;
  const emitProgress = async (status: ProgressStatus, message: string): Promise<void> => {
    await options.onProgress?.({ status, message });
  };

  try {
    await emitProgress('generating', 'Stage 1 / 正在生成面试底稿');
    stage1Draft = await createChatCompletion(
      [
        {
          role: 'system',
          content:
            '你是一名前端面试教练。你只能围绕当前知识点输出中文内容，不要偷换主题，不要输出 JSON。',
        },
        {
          role: 'user',
          content: buildStage1Prompt(topic),
        },
      ],
      { model: getStageModel('stage1'), temperature: 0.15, maxTokens: 2400, providerId: options.modelId }
    );

    let stage1Validation = validateTutorialDraft(topic, stage1Draft);
    for (let retryIndex = 0; retryIndex < 2 && !stage1Validation.success; retryIndex += 1) {
      await emitProgress('generating', `Stage 1 / 首次校验未通过，正在重试（${retryIndex + 1}/2）`);
      stage1Draft = await createChatCompletion(
        [
          {
            role: 'system',
            content:
              '你要立刻输出一份合格的前端面试作答底稿。只讲指定知识点，不要换题，不要提问，不要输出 JSON。',
          },
          {
            role: 'user',
            content: buildStage1RetryPrompt(topic, stage1Draft, stage1Validation.errorMessage),
          },
        ],
        { model: getStageModel('stage1'), temperature: 0.2, maxTokens: 2400, providerId: options.modelId }
      );

      stage1Validation = validateTutorialDraft(topic, stage1Draft);
    }

    if (!stage1Validation.success) {
      return {
        success: false,
        stage1Draft,
        stage2Raw: null,
        errorMessage: stage1Validation.errorMessage,
      };
    }

    const parsedDraft = stage1Validation.parsedDraft;
    const collectedWarnings = [...stage1Validation.warnings];

    await emitProgress('validating', 'Stage 2 / 正在装配面试作答卡组（固定 4 个逻辑卡位）');
    stage2Raw = await createChatCompletion(
      [
        {
          role: 'system',
          content:
            '你负责把结构化的前端面试底稿装配成严格可解析的 CardDocument JSON。只输出 JSON。',
        },
        {
          role: 'user',
          content: buildStage2Prompt(topic, parsedDraft),
        },
      ],
      { model: getStageModel('stage2'), temperature: 0.2, maxTokens: 4000, providerId: options.modelId }
    );

    const stage2Validation = parseAndValidateDocument(topic, parsedDraft, stage2Raw);
    if ('documentJson' in stage2Validation) {
      const warningMessage = joinWarnings([...collectedWarnings, ...stage2Validation.warnings]);
      return {
        success: true,
        stage1Draft,
        stage2Raw,
        documentJson: stage2Validation.documentJson,
        warningMessage,
        finalStatus: warningMessage ? 'ready_with_warnings' : 'ready',
      };
    }

    await emitProgress('validating', 'Stage 2 / 首版卡片未通过校验，正在重试');
    stage2Raw = await createChatCompletion(
      [
        {
          role: 'system',
          content:
            '你负责把结构化的前端面试底稿装配成严格可解析的 CardDocument JSON。只输出 JSON。',
        },
        {
          role: 'user',
          content: buildStage2RetryPrompt(topic, parsedDraft, stage2Raw, stage2Validation.errorMessage),
        },
      ],
      { model: getStageModel('stage2'), temperature: 0.1, maxTokens: 2600, providerId: options.modelId }
    );

    const retriedStage2Validation = parseAndValidateDocument(topic, parsedDraft, stage2Raw);
    if ('documentJson' in retriedStage2Validation) {
      const warningMessage = joinWarnings([...collectedWarnings, ...retriedStage2Validation.warnings]);
      return {
        success: true,
        stage1Draft,
        stage2Raw,
        documentJson: retriedStage2Validation.documentJson,
        warningMessage,
        finalStatus: warningMessage ? 'ready_with_warnings' : 'ready',
      };
    }

    await emitProgress('validating', 'Stage 2 / 正在修复最终卡片结构');
    const repairedStage2Raw = await createChatCompletion(
      [
        {
          role: 'system',
          content: '你负责把不合格的卡片 JSON 修复成最终合法结构。只输出 JSON。',
        },
        {
          role: 'user',
          content: buildRepairPrompt(
            topic,
            parsedDraft,
            stage2Raw,
            retriedStage2Validation.errorMessage
          ),
        },
      ],
      { model: getStageModel('stage2'), temperature: 0.2, maxTokens: 4000, providerId: options.modelId }
    );

    const repairedValidation = parseAndValidateDocument(topic, parsedDraft, repairedStage2Raw);
    if ('documentJson' in repairedValidation) {
      const warningMessage = joinWarnings([...collectedWarnings, ...repairedValidation.warnings]);
      return {
        success: true,
        stage1Draft,
        stage2Raw: repairedStage2Raw,
        documentJson: repairedValidation.documentJson,
        warningMessage,
        finalStatus: warningMessage ? 'ready_with_warnings' : 'ready',
      };
    }

    return {
      success: false,
      stage1Draft,
      stage2Raw: repairedStage2Raw,
      errorMessage: repairedValidation.errorMessage,
    };
  } catch (err) {
    return {
      success: false,
      stage1Draft,
      stage2Raw,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}
