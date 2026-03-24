export interface ParsedTutorialDraft {
  definition: string;
  problem: string;
  standardAnswer: string;
  answerEvidence: string;
  followUpQuestions: string;
  pitfalls: string;
}

export const TUTORIAL_SECTIONS = [
  { key: 'definition', title: '一句话定义：' },
  { key: 'problem', title: '它解决什么问题：' },
  { key: 'standardAnswer', title: '标准面试回答：' },
  { key: 'answerEvidence', title: '回答里的关键论据：' },
  { key: 'followUpQuestions', title: '面试官最可能追问的 3-5 个问题：' },
  { key: 'pitfalls', title: '这道题的易错点：' },
] as const satisfies ReadonlyArray<{
  key: keyof ParsedTutorialDraft;
  title: string;
}>;

export const TUTORIAL_TITLES = TUTORIAL_SECTIONS.map((section) => section.title);

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeSectionText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}
