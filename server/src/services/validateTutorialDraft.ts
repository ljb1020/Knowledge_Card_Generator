import { parseTutorialDraft } from './parseTutorialDraft.js';
import type { ParsedTutorialDraft } from './tutorialDraft.js';

interface RangeCheck {
  hardMin: number;
  hardMax: number;
  idealMin: number;
  idealMax: number;
}

interface ValidationCollector {
  hardErrors: string[];
  warnings: string[];
}

export type TutorialDraftValidationResult =
  | {
      success: true;
      parsedDraft: ParsedTutorialDraft;
      warnings: string[];
    }
  | {
      success: false;
      errorMessage: string;
    };

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

function stripMarkdownCodeFences(value: string): string {
  return value.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '');
}

function countNormalizedChars(value: string): number {
  return value.replace(/\s+/g, '').length;
}

function splitNonEmptyLines(value: string): string[] {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function countGroupedItems(value: string): number {
  const lines = splitNonEmptyLines(value);
  if (lines.length === 0) {
    return 0;
  }

  const numberedLines = lines.filter((line) => /^(?:[-*•]|\d+[.)、]|第[一二三四五六七八九十0-9]+(?:个)?)/.test(line));
  if (numberedLines.length > 0) {
    return numberedLines.length;
  }

  if (lines.length >= 2) {
    return lines.length;
  }

  const sentenceGroups = value
    .split(/[。！？；;\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 6);

  return sentenceGroups.length;
}

function hasAnswerStructure(value: string): boolean {
  if (
    /(?:先|再|然后|最后|第一|第二|第三|本质|接着|补一句|总结|可以这样答|回答时|如果面试官继续追问)/.test(
      value
    )
  ) {
    return true;
  }

  const sentenceCount = value
    .split(/[。！？\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 12).length;

  return sentenceCount >= 3;
}

function hasEvidenceSignal(value: string): boolean {
  const mechanismSignal = /(机制|原理|流程|依赖|触发|更新|渲染|调度|diff|patch|事件循环|执行顺序)/i.test(value);
  const codeSignal =
    /\b(?:useEffect|useMemo|useCallback|useRef|setState|fetch|Promise|async|await|Proxy|Reflect|Object\.defineProperty|addEventListener|removeEventListener|requestAnimationFrame|MutationObserver|IntersectionObserver|Map|Set|WeakMap|WeakSet|prototype|import|export|typeof|instanceof|new|return)\b|=>|===|!==|&&|\|\||API|语法|运行时|JSX|createElement|render|hooks?/i.test(
      value
    );
  const sceneSignal = /(场景|业务|工程|项目|组件|列表|表单|缓存|请求|性能|SSR|水合|状态管理)/.test(value);

  return [mechanismSignal, codeSignal, sceneSignal].filter(Boolean).length >= 1;
}

function normalizeTopic(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function isTopicAligned(topic: string, parsedDraft: ParsedTutorialDraft, draft: string): boolean {
  const normalizedTopic = normalizeTopic(topic);
  if (!normalizedTopic) {
    return true;
  }

  return (
    normalizeTopic(parsedDraft.definition).includes(normalizedTopic) &&
    normalizeTopic(draft).includes(normalizedTopic)
  );
}

function pushRangeIssue(
  collector: ValidationCollector,
  stageLabel: string,
  partLabel: string,
  actualLength: number,
  range: RangeCheck
): void {
  if (actualLength < range.hardMin || actualLength > range.hardMax) {
    collector.hardErrors.push(
      `${stageLabel} / ${partLabel} / 总字数 ${actualLength} 超出可接受范围 ${range.hardMin}~${range.hardMax}`
    );
    return;
  }

  if (actualLength < range.idealMin || actualLength > range.idealMax) {
    collector.warnings.push(
      `${stageLabel} / ${partLabel} / 总字数 ${actualLength} 偏离理想范围 ${range.idealMin}~${range.idealMax}`
    );
  }
}

function pushCountIssue(
  collector: ValidationCollector,
  stageLabel: string,
  partLabel: string,
  actualCount: number,
  idealMin: number,
  idealMax: number,
  hardMin: number,
  hardMax: number
): void {
  if (actualCount < hardMin || actualCount > hardMax) {
    collector.hardErrors.push(
      `${stageLabel} / ${partLabel} / 条数 ${actualCount} 超出可接受范围 ${hardMin}~${hardMax}`
    );
    return;
  }

  if (actualCount < idealMin || actualCount > idealMax) {
    collector.warnings.push(
      `${stageLabel} / ${partLabel} / 条数 ${actualCount} 偏离理想范围 ${idealMin}~${idealMax}`
    );
  }
}

export function validateTutorialDraft(topic: string, draft: string): TutorialDraftValidationResult {
  const trimmed = draft.trim();
  const normalizedForValidation = stripMarkdownCodeFences(trimmed).trim();

  if (!trimmed) {
    return { success: false, errorMessage: 'Stage 1 / 底稿 / 内容为空' };
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return { success: false, errorMessage: 'Stage 1 / 底稿 / 错误地返回了 JSON，而不是面试底稿' };
  }

  if (/<[^>]+>/.test(trimmed)) {
    return { success: false, errorMessage: 'Stage 1 / 底稿 / 不允许输出 HTML' };
  }

  if (/please provide|please tell me|请输入|请提供|补充信息/i.test(trimmed)) {
    return {
      success: false,
      errorMessage: 'Stage 1 / 底稿 / 没有直接生成内容，而是反过来向用户索取信息',
    };
  }

  let parsedDraft: ParsedTutorialDraft;
  try {
    parsedDraft = parseTutorialDraft(normalizedForValidation);
  } catch (error) {
    return {
      success: false,
      errorMessage: error instanceof Error ? `Stage 1 / 解析 / ${error.message}` : String(error),
    };
  }

  const collector: ValidationCollector = {
    hardErrors: [],
    warnings: [],
  };

  if (!isTopicAligned(topic, parsedDraft, normalizedForValidation)) {
    collector.hardErrors.push(`Stage 1 / 主题一致性 / 内容没有严格围绕“${topic}”展开`);
  }

  const answerLength = countNormalizedChars(parsedDraft.standardAnswer);
  pushRangeIssue(collector, 'Stage 1', '标准面试回答', answerLength, ANSWER_RANGE);

  if (!hasAnswerStructure(parsedDraft.standardAnswer)) {
    collector.warnings.push('Stage 1 / 标准面试回答 / 表达顺序不够清晰，建议补出更明显的答题结构');
  }

  if (!hasEvidenceSignal(parsedDraft.answerEvidence)) {
    collector.warnings.push('Stage 1 / 回答里的关键论据 / 没有明显覆盖机制、代码或场景，论据支撑偏弱');
  }

  const followUpCount = countGroupedItems(parsedDraft.followUpQuestions);
  pushCountIssue(collector, 'Stage 1', '高频追问', followUpCount, 3, 5, 2, 6);

  const followUpLength = countNormalizedChars(parsedDraft.followUpQuestions);
  pushRangeIssue(collector, 'Stage 1', '高频追问', followUpLength, FOLLOW_UP_RANGE);

  const pitfallCount = countGroupedItems(parsedDraft.pitfalls);
  pushCountIssue(collector, 'Stage 1', '易错点', pitfallCount, 3, 5, 2, 6);

  const pitfallLength = countNormalizedChars(parsedDraft.pitfalls);
  pushRangeIssue(collector, 'Stage 1', '易错点', pitfallLength, PITFALL_RANGE);

  if (collector.hardErrors.length > 0) {
    return {
      success: false,
      errorMessage: collector.hardErrors.join('\n'),
    };
  }

  return {
    success: true,
    parsedDraft,
    warnings: collector.warnings,
  };
}
