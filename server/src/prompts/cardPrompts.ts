import { CARD_STYLE_VERSION, DEFAULT_GENERATED_CARD_COUNT, VALIDATION_RULES } from 'shared';
import type { ParsedTutorialDraft } from '../services/tutorialDraft.js';

const CARD_STRUCTURE_RULES = [
  `根对象必须包含 topic、styleVersion、cards，且 styleVersion 必须等于 "${CARD_STYLE_VERSION}"。`,
  `cards 数量必须等于 ${DEFAULT_GENERATED_CARD_COUNT}。`,
  '第 1 张卡必须是 cover，第 2 到第 4 张卡必须是 bullet。',
  `cover.tag 必须等于 "${VALIDATION_RULES.cover.tag}"。`,
  '固定逻辑卡位顺序是：cover + 完整面试回答 + 高频追问 + 易错点。',
];

const CARD_FIELD_RULES = [
  `cover.title 最多 ${VALIDATION_RULES.cover.titleMax} 个字符。`,
  `cover.subtitle 最多 ${VALIDATION_RULES.cover.subtitleMax} 个字符。`,
  `bullet.title 最多 ${VALIDATION_RULES.bullet.titleMax} 个字符。`,
  `每张 bullet 卡必须有 ${VALIDATION_RULES.bullet.bulletsMin} 到 ${VALIDATION_RULES.bullet.bulletsMax} 条 bullets。`,
  `每条 bullet 最多 ${VALIDATION_RULES.bullet.bulletMax} 个字符。`,
  'bullet-1 整张卡总字数目标为 300 到 600 字。',
  'bullet-2 整张卡总字数目标为 200 到 400 字。',
  'bullet-3 整张卡总字数目标为 200 到 400 字。',
  'bullet-1.title 必须固定写成“完整面试回答”。',
  'bullet-2.title 必须固定写成“高频追问”。',
  'bullet-3.title 必须固定写成“易错点”。',
];

const CARD_CONTENT_RULES = [
  '所有用户可见内容必须使用简体中文。',
  '不要输出 Markdown、HTML、emoji、代码块。',
  '不要把这组内容做成摘要卡，要做成面试作答卡组；文档层固定 4 个逻辑卡位。',
  '所有卡片都必须严格围绕目标知识点，cover.title 必须与传入的“目标知识点”完全一致，不加任何额外修饰语。',
  'cover.subtitle 只负责“一句话定义 + 它解决什么问题”。',
  'bullet-1 只负责“标准面试回答”，读者按顺序读完 bullets 后，应能拼出一段完整的 1 到 2 分钟回答。',
  'bullet-1 可以吸收“回答里的关键论据”补强，但不能退化成关键词堆砌。',
  'bullet-1 不要写得太短，必须有足够展开度，整体信息量控制在 300 到 600 字。',
  'bullet-1 必须写成前端面试生真正会说出口的完整回答，不要出现“定义：”“关键论据：”“总结：”“第一点：”这类提纲标签。',
  'bullet-1 的每条 bullet 都应该像连续口语句子，读起来能自然衔接成一段回答。',
  'bullet-2 只负责“面试官最可能追问的 3-5 个问题”，每条最好包含“问题 + 一句答题方向”。',
  'bullet-2 不要只列问题关键词，整体信息量控制在 200 到 400 字。',
  'bullet-3 只负责“这道题的易错点”，每条最好包含“错在哪里 / 容易混到哪里 / 为什么会丢分”。',
  'bullet-3 不要只列名词，整体信息量控制在 200 到 400 字。',
  '不要再额外创造第 5 张、第 6 张卡，也不要输出 summary 卡。',
];

const CARD_JSON_SKELETON = JSON.stringify(
  {
    topic: 'string',
    styleVersion: CARD_STYLE_VERSION,
    cards: [
      {
        id: 'cover-1',
        type: 'cover',
        title: '{必须原封不动填入目标知识点}',
        subtitle: 'string',
        tag: VALIDATION_RULES.cover.tag,
      },
      {
        id: 'bullet-1',
        type: 'bullet',
        title: '高频追问',
        bullets: ['string', 'string', 'string'],
      },
      {
        id: 'bullet-2',
        type: 'bullet',
        title: '易错点',
        bullets: ['string', 'string', 'string'],
      },
      {
        id: 'bullet-3',
        type: 'bullet',
        title: 'string',
        bullets: ['string', 'string', 'string'],
      },
    ],
  },
  null,
  2
);

function formatParsedDraft(parsedDraft: ParsedTutorialDraft): string {
  return [
    '一句话定义：',
    parsedDraft.definition,
    '',
    '它解决什么问题：',
    parsedDraft.problem,
    '',
    '标准面试回答：',
    parsedDraft.standardAnswer,
    '',
    '回答里的关键论据：',
    parsedDraft.answerEvidence,
    '',
    '面试官最可能追问的 3-5 个问题：',
    parsedDraft.followUpQuestions,
    '',
    '这道题的易错点：',
    parsedDraft.pitfalls,
  ].join('\n');
}

function buildSharedCardPrompt(topic: string, parsedDraft: ParsedTutorialDraft): string[] {
  return [
    `目标知识点：${topic}`,
    '',
    '结构规则：',
    ...CARD_STRUCTURE_RULES.map((rule) => `- ${rule}`),
    '',
    '字段与长度规则：',
    ...CARD_FIELD_RULES.map((rule) => `- ${rule}`),
    '',
    '内容覆盖规则：',
    ...CARD_CONTENT_RULES.map((rule) => `- ${rule}`),
    '',
    'JSON 骨架模板：',
    CARD_JSON_SKELETON,
    '',
    '结构化底稿：',
    formatParsedDraft(parsedDraft),
  ];
}

export function buildStage2Prompt(topic: string, parsedDraft: ParsedTutorialDraft): string {
  return [
    '你是一名前端面试内容编辑。',
    `请把下面的结构化底稿装配成合法的 ${DEFAULT_GENERATED_CARD_COUNT} 个逻辑卡位的 CardDocument JSON。`,
    '只输出 JSON 对象本身，不要附加解释。',
    '',
    ...buildSharedCardPrompt(topic, parsedDraft),
  ].join('\n');
}

export function buildStage2RetryPrompt(
  topic: string,
  parsedDraft: ParsedTutorialDraft,
  previousOutput: string,
  validationError: string
): string {
  return [
    '你上一版 CardDocument JSON 未通过校验，现在必须完整重写。',
    '不要只修一个错误，必须继续满足全部结构规则、长度规则、内容覆盖规则和 JSON 骨架要求。',
    '只输出最终合法 JSON。',
    '',
    ...buildSharedCardPrompt(topic, parsedDraft),
    '',
    '校验错误：',
    validationError,
    '',
    '上一版输出：',
    previousOutput || '（空）',
  ].join('\n');
}

export function buildRepairPrompt(
  topic: string,
  parsedDraft: ParsedTutorialDraft,
  invalidStage2: string,
  validationErrors: string
): string {
  return [
    '你会收到一份不合法的 CardDocument JSON 或近似 JSON，请将其修复为最终合法结果。',
    '修复时必须完整遵守全部结构规则、长度规则、内容覆盖规则和 JSON 骨架要求。',
    '只输出最终合法 JSON，不要输出解释。',
    '',
    ...buildSharedCardPrompt(topic, parsedDraft),
    '',
    '校验错误：',
    validationErrors,
    '',
    '待修复内容：',
    invalidStage2,
  ].join('\n');
}
