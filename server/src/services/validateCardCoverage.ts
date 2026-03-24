import { DEFAULT_GENERATED_CARD_COUNT, type CardDocument } from 'shared';
import type { ParsedTutorialDraft } from './tutorialDraft.js';

interface CoverageValidationResult {
  hardErrors: string[];
  warnings: string[];
}

interface RangeCheck {
  hardMin: number;
  hardMax: number;
  idealMin: number;
  idealMax: number;
}

const ANSWER_RANGE: RangeCheck = {
  hardMin: 240,
  hardMax: 1000,
  idealMin: 300,
  idealMax: 800,
};

const FOLLOW_UP_RANGE: RangeCheck = {
  hardMin: 160,
  hardMax: 800,
  idealMin: 200,
  idealMax: 600,
};

const PITFALL_RANGE: RangeCheck = {
  hardMin: 160,
  hardMax: 800,
  idealMin: 200,
  idealMax: 600,
};

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function hasMeaningfulOverlap(source: string, target: string): boolean {
  const sourceTokens =
    source.match(/[A-Za-z][A-Za-z0-9_.-]{1,}|[\u4e00-\u9fff]{2,}/g)?.map((token) =>
      normalizeSearchText(token)
    ) ?? [];
  const normalizedTarget = normalizeSearchText(target);

  return sourceTokens.some((token) => token.length >= 2 && normalizedTarget.includes(token));
}

function hasAnswerSignal(value: string): boolean {
  return /(回答|答法|先说|然后|最后|本质|价值|机制|如果面试官继续追问)/.test(value);
}

function hasQuestionSignal(value: string): boolean {
  return /(为什么|怎么|区别|场景|如果|会怎样|追问|面试官)/.test(value);
}

function hasPitfallSignal(value: string): boolean {
  return /(误区|易错|容易|不要|混淆|丢分|错在)/.test(value);
}

function hasAnswerOutlineLabel(value: string): boolean {
  return /(?:^|[：:\s])(定义|关键论据|总结|第一点|第二点|第三点|答题结构|回答思路)[：:]/.test(value);
}

function getCardText(card: CardDocument['cards'][number]): string {
  if (card.type === 'cover') {
    return `${card.title}\n${card.subtitle}`;
  }

  return `${card.title}\n${card.bullets.join('\n')}`;
}

function getBulletBodyLength(card: Extract<CardDocument['cards'][number], { type: 'bullet' }>): number {
  return card.bullets.join('').replace(/\s+/g, '').length;
}

function pushRangeIssue(
  result: CoverageValidationResult,
  partLabel: string,
  actualLength: number,
  range: RangeCheck
): void {
  if (actualLength < range.hardMin || actualLength > range.hardMax) {
    result.hardErrors.push(
      `Stage 2 / ${partLabel} / 总字数 ${actualLength} 超出可接受范围 ${range.hardMin}~${range.hardMax}`
    );
    return;
  }

  if (actualLength < range.idealMin || actualLength > range.idealMax) {
    result.warnings.push(
      `Stage 2 / ${partLabel} / 总字数 ${actualLength} 偏离理想范围 ${range.idealMin}~${range.idealMax}`
    );
  }
}

function pushCountIssue(
  result: CoverageValidationResult,
  partLabel: string,
  actualCount: number,
  idealMin: number,
  idealMax: number,
  hardMin: number,
  hardMax: number
): void {
  if (actualCount < hardMin || actualCount > hardMax) {
    result.hardErrors.push(
      `Stage 2 / ${partLabel} / 条数 ${actualCount} 超出可接受范围 ${hardMin}~${hardMax}`
    );
    return;
  }

  if (actualCount < idealMin || actualCount > idealMax) {
    result.warnings.push(
      `Stage 2 / ${partLabel} / 条数 ${actualCount} 偏离理想范围 ${idealMin}~${idealMax}`
    );
  }
}

export function validateCardCoverage(
  topic: string,
  document: CardDocument,
  parsedDraft: ParsedTutorialDraft
): CoverageValidationResult {
  const result: CoverageValidationResult = {
    hardErrors: [],
    warnings: [],
  };

  if (document.cards.length !== DEFAULT_GENERATED_CARD_COUNT) {
    result.hardErrors.push(`Stage 2 / 卡片结构 / 卡片总数必须是 ${DEFAULT_GENERATED_CARD_COUNT}`);
    return result;
  }

  const [coverCard, answerCard, followUpCard, pitfallCard] = document.cards;

  if (coverCard.type !== 'cover') {
    result.hardErrors.push('Stage 2 / 卡片结构 / 第 1 张卡必须是 cover');
    return result;
  }

  if (answerCard?.type !== 'bullet' || followUpCard?.type !== 'bullet' || pitfallCard?.type !== 'bullet') {
    result.hardErrors.push('Stage 2 / 卡片结构 / 第 2 到第 4 张卡必须都是 bullet');
    return result;
  }

  const coverText = getCardText(coverCard);
  const answerText = getCardText(answerCard);
  const followUpText = getCardText(followUpCard);
  const pitfallText = getCardText(pitfallCard);
  const normalizedTopic = normalizeSearchText(topic);

  if (normalizedTopic && !normalizeSearchText(coverText).includes(normalizedTopic)) {
    result.hardErrors.push('Stage 2 / cover 定义卡 / 没有直接点明当前知识点');
  }

  if (!hasMeaningfulOverlap(`${parsedDraft.definition}\n${parsedDraft.problem}`, coverText)) {
    result.hardErrors.push('Stage 2 / cover 定义卡 / 没有覆盖“定义 + 它解决什么问题”');
  }

  if (!hasMeaningfulOverlap(parsedDraft.standardAnswer, answerText) || !hasAnswerSignal(answerText)) {
    result.hardErrors.push('Stage 2 / bullet-1 标准回答卡 / 没有形成可复述的标准回答');
  }
  if (answerCard.bullets.some((bullet) => hasAnswerOutlineLabel(bullet))) {
    result.warnings.push('Stage 2 / bullet-1 标准回答卡 / 出现了“定义：”“关键论据：”“总结：”这类提纲标签，口语感不够');
  }
  pushCountIssue(result, 'bullet-1 标准回答卡', answerCard.bullets.length, 3, 5, 2, 6);
  pushRangeIssue(result, 'bullet-1 标准回答卡', getBulletBodyLength(answerCard), ANSWER_RANGE);

  if (!hasMeaningfulOverlap(parsedDraft.followUpQuestions, followUpText) || !hasQuestionSignal(followUpText)) {
    result.hardErrors.push('Stage 2 / bullet-2 高频追问卡 / 内容不像真实追问');
  }
  pushCountIssue(result, 'bullet-2 高频追问卡', followUpCard.bullets.length, 3, 5, 2, 6);
  pushRangeIssue(result, 'bullet-2 高频追问卡', getBulletBodyLength(followUpCard), FOLLOW_UP_RANGE);

  if (!hasMeaningfulOverlap(parsedDraft.pitfalls, pitfallText) || !hasPitfallSignal(pitfallText)) {
    result.hardErrors.push('Stage 2 / bullet-3 易错点卡 / 内容不像易错点总结');
  }
  pushCountIssue(result, 'bullet-3 易错点卡', pitfallCard.bullets.length, 3, 5, 2, 6);
  pushRangeIssue(result, 'bullet-3 易错点卡', getBulletBodyLength(pitfallCard), PITFALL_RANGE);

  return result;
}
