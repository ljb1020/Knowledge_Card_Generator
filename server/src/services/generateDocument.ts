import { CardDocumentSchema, type CardDocument, generateId } from 'shared';
import { ZodError, ZodIssueCode } from 'zod';
import { createChatCompletion } from '../llm/minimaxClient.js';
import {
  buildRepairPrompt,
  buildStage1Prompt,
  buildStage1RetryPrompt,
  buildStage2Prompt,
  buildStage2RetryPrompt,
} from '../prompts/generateDocument.js';

interface GenerateDocumentSuccess {
  success: true;
  stage1Draft: string;
  stage2Raw: string;
  documentJson: CardDocument;
}

interface GenerateDocumentFailure {
  success: false;
  stage1Draft: string | null;
  stage2Raw: string | null;
  errorMessage: string;
}

export type GenerateDocumentResult = GenerateDocumentSuccess | GenerateDocumentFailure;

function validateStage1Draft(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '第一阶段讲解草稿为空';
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return '第一阶段错误地返回了 JSON，而不是中文讲解草稿';
  }

  const requiredSections = [
    '概念定义：',
    '为什么重要：',
    '核心机制：',
    '常见误区与考点：',
    '一句话总结：',
  ];
  const missingSections = requiredSections.filter((section) => !trimmed.includes(section));
  if (missingSections.length > 0) {
    return `第一阶段草稿缺少必需章节：${missingSections.join('、')}`;
  }

  if (/please provide|please tell me|请输入|请提供|补充信息/i.test(trimmed)) {
    return '第一阶段草稿没有直接写内容，而是反过来向用户索取信息';
  }

  return null;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('模型输出中没有找到合法的 JSON 对象');
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

function normalizeCard(card: Record<string, unknown>): Record<string, unknown> {
  const type = card.type;
  const id = typeof card.id === 'string' && card.id.trim() ? card.id : generateId();

  if (type === 'cover') {
    return {
      id,
      type,
      title: normalizeText(card.title),
      subtitle: normalizeText(card.subtitle),
      tag: '前端知识点',
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

  if (type === 'summary') {
    return {
      id,
      type,
      title: normalizeText(card.title),
      summary: normalizeText(card.summary),
      cta: normalizeText(card.cta),
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
    styleVersion: 'frontend-card-v1',
    cards: rawCards.map((card) => normalizeCard((card ?? {}) as Record<string, unknown>)),
  };
}

function containsDisallowedText(value: string): boolean {
  return /<[^>]+>|```|\p{Extended_Pictographic}/u.test(value);
}

function validateContentRules(document: CardDocument): string[] {
  const errors: string[] = [];

  document.cards.forEach((card: CardDocument['cards'][number], index: number) => {
    const prefix = `cards[${index}]`;
    if (containsDisallowedText(card.title)) {
      errors.push(`${prefix}.title 含有不允许出现的标记内容`);
    }

    if (card.type === 'cover') {
      if (containsDisallowedText(card.subtitle)) {
        errors.push(`${prefix}.subtitle 含有不允许出现的标记内容`);
      }
      return;
    }

    if (card.type === 'bullet') {
      card.bullets.forEach((bullet: string, bulletIndex: number) => {
        if (containsDisallowedText(bullet)) {
          errors.push(`${prefix}.bullets[${bulletIndex}] 含有不允许出现的标记内容`);
        }
      });
      return;
    }

    if (containsDisallowedText(card.summary)) {
      errors.push(`${prefix}.summary 含有不允许出现的标记内容`);
    }
    if (containsDisallowedText(card.cta)) {
      errors.push(`${prefix}.cta 含有不允许出现的标记内容`);
    }
  });

  return errors;
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

  if (issue.code === ZodIssueCode.custom) {
    return `${target}：${issue.message}`;
  }

  return `${target}：${issue.message}`;
}

function formatZodErrors(error: ZodError): string {
  return error.issues
    .map((issue) => formatZodIssue(issue))
    .join('\n');
}

function parseAndValidateDocument(topic: string, raw: string): { documentJson: CardDocument } | { errorMessage: string } {
  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as unknown;
    const normalized = normalizeDocument(topic, parsed);
    const validated = CardDocumentSchema.parse(normalized);
    const contentErrors = validateContentRules(validated);
    if (contentErrors.length > 0) {
      return { errorMessage: contentErrors.join('\n') };
    }

    return { documentJson: validated };
  } catch (err) {
    if (err instanceof ZodError) {
      return { errorMessage: formatZodErrors(err) };
    }

    return { errorMessage: err instanceof Error ? err.message : String(err) };
  }
}

export async function generateDocumentForTopic(topic: string): Promise<GenerateDocumentResult> {
  let stage1Draft: string | null = null;
  let stage2Raw: string | null = null;

  try {
    stage1Draft = await createChatCompletion(
      [
        {
          role: 'system',
          content: '你是一名资深前端技术作者，擅长为中文读者输出准确、实用、专业的前端知识讲解。',
        },
        {
          role: 'user',
          content: buildStage1Prompt(topic),
        },
      ],
      { temperature: 0.3, maxTokens: 1600 }
    );

    let stage1Error = validateStage1Draft(stage1Draft);
    if (stage1Error) {
      stage1Draft = await createChatCompletion(
        [
          {
            role: 'system',
            content: '你要立即输出一份合格的前端中文讲解草稿，不要提问，不要索取更多信息。',
          },
          {
            role: 'user',
            content: buildStage1RetryPrompt(topic, stage1Draft, stage1Error),
          },
        ],
        { temperature: 0.2, maxTokens: 1600 }
      );

      stage1Error = validateStage1Draft(stage1Draft);
    }

    if (stage1Error) {
      return {
        success: false,
        stage1Draft,
        stage2Raw: null,
        errorMessage: stage1Error,
      };
    }

    stage2Raw = await createChatCompletion(
      [
        {
          role: 'system',
          content: '你负责把前端讲解草稿转换成严格可解析的 JSON 卡片数据，只输出 JSON。',
        },
        {
          role: 'user',
          content: buildStage2Prompt(topic, stage1Draft),
        },
      ],
      { temperature: 0.2, maxTokens: 3200 }
    );

    const stage2Validation = parseAndValidateDocument(topic, stage2Raw);
    if ('documentJson' in stage2Validation) {
      return {
        success: true,
        stage1Draft,
        stage2Raw,
        documentJson: stage2Validation.documentJson,
      };
    }

    stage2Raw = await createChatCompletion(
      [
        {
          role: 'system',
          content: '你负责把前端讲解草稿转换成严格可解析的 JSON 卡片数据，只输出 JSON。',
        },
        {
          role: 'user',
          content: buildStage2RetryPrompt(topic, stage1Draft, stage2Raw, stage2Validation.errorMessage),
        },
      ],
      { temperature: 0.1, maxTokens: 3200 }
    );

    const retriedStage2Validation = parseAndValidateDocument(topic, stage2Raw);
    if ('documentJson' in retriedStage2Validation) {
      return {
        success: true,
        stage1Draft,
        stage2Raw,
        documentJson: retriedStage2Validation.documentJson,
      };
    }

    const repairedStage2Raw = await createChatCompletion(
      [
        {
          role: 'system',
          content: '你负责把不合格的卡片 JSON 修复成最终合法结果，只输出 JSON。',
        },
        {
          role: 'user',
          content: buildRepairPrompt(topic, stage1Draft, stage2Raw, retriedStage2Validation.errorMessage),
        },
      ],
      { temperature: 0.2, maxTokens: 3200 }
    );

    const repairedValidation = parseAndValidateDocument(topic, repairedStage2Raw);
    if ('documentJson' in repairedValidation) {
      return {
        success: true,
        stage1Draft,
        stage2Raw: repairedStage2Raw,
        documentJson: repairedValidation.documentJson,
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
