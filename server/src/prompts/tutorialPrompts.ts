import { TUTORIAL_SECTIONS } from '../services/tutorialDraft.js';

const TUTORIAL_STYLE_RULES = [
  '所有内容必须使用简体中文。',
  '目标不是知识摘要，而是为固定 4 个逻辑卡位的“面试作答卡组”提供可直接装配的底稿。',
  '必须严格围绕用户给定的那个知识点展开，不能偷换成相关概念、上位概念或相邻概念。',
  '标题必须出现且仅出现一次，顺序固定，标题文字完全一致。',
  '不要输出 JSON、Markdown 代码块、HTML。',
  '整体要有面试训练价值，不要写成百科词条。',
];

const TUTORIAL_SECTION_RULES = [
  '“一句话定义”用 1 到 2 句讲清这个知识点是什么，第一句必须直接点名该知识点。',
  '“它解决什么问题”必须落到前端工程里的真实价值、真实痛点或为什么会被问。',
  '“标准面试回答”写成一段可直接对面试官复述的中文回答，长度目标约 300 到 600 字，可以稍微口语化，但必须完整。',
  '“回答里的关键论据”用于拆出支撑回答的抓手，至少覆盖机制、代码、场景中的 1 类，最好写成 3 到 5 条。',
  '“面试官最可能追问的 3-5 个问题”必须按 1. 2. 3. 的编号强制分行，写满 3 到 5 个高频追问。绝对不能只回答一句话！必须写成“追问问题 + 详细的答题方向和核心原理点拨”，单条必须包含 60 到 100 字，总体内容必须在 250 到 400 字之间，务必翔实。',
  '“这道题的易错点”必须按 1. 2. 3. 的编号强制分行，写满 3 到 5 个易错点。绝对不能只列名词！必须写成“具体的易错概念 + 为什么会错 / 深入的避坑指南”，单条必须包含 60 到 100 字，总体内容必须在 250 到 400 字之间，务必翔实。',
];

function buildTutorialRulesBlock(): string[] {
  return [
    '固定标题：',
    ...TUTORIAL_SECTIONS.map((section) => section.title),
    '',
    '通用规则：',
    ...TUTORIAL_STYLE_RULES.map((rule) => `- ${rule}`),
    '',
    '分标题要求：',
    ...TUTORIAL_SECTION_RULES.map((rule) => `- ${rule}`),
  ];
}

function buildTopicLockRules(topic: string): string[] {
  return [
    '知识点锁定规则：',
    `- 本次唯一知识点是“${topic}”，不能替换成别的概念。`,
    `- “一句话定义”第一句必须直接写成“${topic}是……”或“${topic}（……）是……”。`,
    '- 如果内容主体写成别的概念，整份底稿视为失败。',
  ];
}

export function buildStage1Prompt(topic: string): string {
  return [
    '你是一名前端面试教练。',
    '请围绕给定知识点，直接输出一份“面试作答底稿”。',
    '这份底稿后续会被提炼成 4 个逻辑卡位：cover、标准回答、追问、易错点。',
    '不要提问，不要索取更多上下文，不要解释你要做什么。',
    '',
    ...buildTopicLockRules(topic),
    '',
    ...buildTutorialRulesBlock(),
    '',
    `唯一知识点：${topic}`,
  ].join('\n');
}

export function buildStage1RetryPrompt(
  topic: string,
  previousDraft: string,
  validationError: string
): string {
  return [
    '你上一版输出未通过校验，现在必须完整重写一份合格的“面试作答底稿”。',
    '这不是局部修补，必须重新输出最终版本，并继续遵守全部结构规则、长度规则和内容覆盖规则。',
    '尤其注意：追问和易错点都必须按编号单独分行写，不要挤成一大段。',
    '如果追问或易错点超长，请优先压缩到“一行一个点，每行一句主干 + 一句点拨”的写法。',
    '',
    ...buildTopicLockRules(topic),
    '',
    ...buildTutorialRulesBlock(),
    '',
    `唯一知识点：${topic}`,
    '',
    '校验错误：',
    validationError,
    '',
    '上一版底稿：',
    previousDraft,
  ].join('\n');
}
