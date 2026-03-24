import {
  type ParsedTutorialDraft,
  TUTORIAL_SECTIONS,
  escapeRegExp,
  normalizeSectionText,
} from './tutorialDraft.js';

function getHeadingMatch(draft: string, title: string): RegExpExecArray | null {
  return new RegExp(`^\\s*${escapeRegExp(title)}`, 'm').exec(draft);
}

function getHeadingIndex(draft: string, title: string): number {
  const match = getHeadingMatch(draft, title);
  if (!match) {
    throw new Error(`底稿缺少固定标题：${title}`);
  }

  return match.index;
}

function getHeadingOccurrences(draft: string, title: string): number {
  return (draft.match(new RegExp(`^\\s*${escapeRegExp(title)}`, 'gm')) ?? []).length;
}

export function parseTutorialDraft(draft: string): ParsedTutorialDraft {
  const normalizedDraft = draft.replace(/\r\n/g, '\n').trim();
  if (!normalizedDraft) {
    throw new Error('底稿为空');
  }

  const positions = TUTORIAL_SECTIONS.map((section) => {
    const occurrences = getHeadingOccurrences(normalizedDraft, section.title);
    if (occurrences === 0) {
      throw new Error(`底稿缺少固定标题：${section.title}`);
    }
    if (occurrences > 1) {
      throw new Error(`固定标题只能出现一次：${section.title}`);
    }

    const match = getHeadingMatch(normalizedDraft, section.title)!;
    return {
      ...section,
      start: getHeadingIndex(normalizedDraft, section.title),
      contentStart: match.index + match[0].length,
    };
  });

  for (let index = 1; index < positions.length; index += 1) {
    if (positions[index].start <= positions[index - 1].start) {
      throw new Error(
        `固定标题顺序错误：“${positions[index - 1].title}”必须出现在“${positions[index].title}”之前`
      );
    }
  }

  const parsed = {} as ParsedTutorialDraft;

  positions.forEach((section, index) => {
    const contentEnd = index < positions.length - 1 ? positions[index + 1].start : normalizedDraft.length;
    const content = normalizeSectionText(normalizedDraft.slice(section.contentStart, contentEnd));
    if (!content) {
      throw new Error(`固定标题下内容不能为空：${section.title}`);
    }

    parsed[section.key] = content;
  });

  return parsed;
}
