import type { Card, BulletCard } from 'shared';

export interface RenderItem {
  key: string;
  card: Card;
  current: number;
  total: number;
  sectionIndex: number;      // 0-3，对应 bento 4 个条目
  bulletsToShow: string[];   // cover 卡传空数组，bullet 卡传切片
  bulletOffset: number;      // 本页第一条 bullet 在原数组中的起始下标
}

const MAX_USABLE_HEIGHT = 889; // 1440 - 231(顶部标题区) - 320(底部 bento + padding)

// Container 实际内宽计算（根据 BulletCardView.tsx 布局）：
// Canvas: 1080 - 72*2 = 936px
// Bullet 容器: flex gap 20px, left nav(>_ 01) ~50px
// Bullet Content paddingLeft(24) + paddingRight(22) + borderLeft(2) = 48px
// content 可用宽度 ≈ 936 - 20 - 50 - 48 = 818px
const CONTENT_WIDTH_PX = 818;
const BULLET_PADDING_PX = 26; // paddingTop(12) + paddingBottom(14)
const BULLET_GAP_PX = 28;     // bullets flex gap

const QUESTION_MARKS = new Set(['？', '?']);

function getQuestionMarkIndexes(text: string): number[] {
  const indexes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (QUESTION_MARKS.has(text[i])) indexes.push(i);
  }
  return indexes;
}

function stripAnswerLead(text: string): string {
  return text.replace(/^(?:\s*(?:——|--|-)\s*)+/, '').trim();
}

function splitQA(text: string): { question: string; answer: string } | null {
  const normalized = text.trim();
  const questionIndexes = getQuestionMarkIndexes(normalized);
  if (questionIndexes.length === 0) return null;

  const cuePatterns = [ /答题方向[:：]/u, /答[:：]/u, /——/u, /--/u, /\s-\s/u ];

  for (const pattern of cuePatterns) {
    const match = pattern.exec(normalized);
    if (!match || match.index <= 0) continue;
    const questionIndex = [...questionIndexes].reverse().find((idx) => idx < match.index);
    if (questionIndex === undefined) continue;
    const question = normalized.slice(0, questionIndex + 1).trim();
    const answer = stripAnswerLead(normalized.slice(match.index));
    if (question && answer) return { question, answer };
  }

  if (questionIndexes.length === 1) {
    const question = normalized.slice(0, questionIndexes[0] + 1).trim();
    const answer = normalized.slice(questionIndexes[0] + 1).trim();
    if (question && answer) return { question, answer };
  }

  return null;
}

// 将 Markdown 加粗转化为真正的 HTML 节点（用于离线测距）
function convertMarkdownToHtml(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map(part => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return `<strong style="font-weight: 600;">${part.slice(2, -2)}</strong>`;
    }
    return part; 
  }).join('');
}

/**
 * 原生 DOM 离线渲染测量高度 (100% 精确)
 */
function measureDomHeight(bullet: string, isFollowUp: boolean, fontSize: string): number {
  if (typeof document === 'undefined') {
    // SSR 回退：按纯字数估算（每行27字，行高1.65）
    return BULLET_PADDING_PX + Math.ceil(bullet.length / 27) * parseFloat(fontSize) * 1.65;
  }

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.visibility = 'hidden';
  container.style.pointerEvents = 'none';
  container.style.width = `${CONTENT_WIDTH_PX}px`;
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
  container.style.fontSize = fontSize;
  container.style.lineHeight = '1.65';
  
  const qa = isFollowUp ? splitQA(bullet) : null;
  if (qa) {
    container.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 10px;">${convertMarkdownToHtml(qa.question)}</div>
      <div>${convertMarkdownToHtml(qa.answer)}</div>
    `;
  } else {
    container.innerHTML = `<span>${convertMarkdownToHtml(bullet.trim())}</span>`;
  }

  document.body.appendChild(container);
  const textHeight = container.clientHeight;
  document.body.removeChild(container);

  return textHeight + BULLET_PADDING_PX;
}

/**
 * 动态安全拆页：基于实时计算当前页所有条目的字数并根据动态 fontSize 用 DOM 测算高度
 */
function paginateBullets(bullets: string[], isFollowUp: boolean): string[][] {
  const pages: string[][] = [];
  let currentPage: string[] = [];

  for (const b of bullets) {
    const testPage = [...currentPage, b];
    
    // 按 BulletCardView 规则实时计算放进去后的 fontSize
    const totalTextLength = testPage.reduce((sum, item) => sum + item.length, 0);
    const fontSize = totalTextLength > 200 ? '30px' : totalTextLength > 120 ? '32px' : '34px';

    // 基于这个 fontSize，测算整页放进去后的所需物理高度
    let testHeight = 0;
    for (let i = 0; i < testPage.length; i++) {
        testHeight += measureDomHeight(testPage[i], isFollowUp, fontSize);
        if (i > 0) testHeight += BULLET_GAP_PX;
    }

    if (currentPage.length > 0 && testHeight > MAX_USABLE_HEIGHT) {
      // 容纳不下：锁定前一页
      pages.push(currentPage);
      currentPage = [b]; // 新页只有当前条目
    } else {
      // 能容纳，更新当前页
      currentPage = testPage;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.length === 0 ? [[]] : pages;
}

export function expandCards(cards: Card[]): RenderItem[] {
  // 先预计算所有卡的物理页数
  const cardPages = cards.map((card, sectionIndex) => {
    if (card.type === 'cover') return { card, pages: [[]] as string[][], sectionIndex };

    const bullets = (card as BulletCard).bullets;
    const isFollowUp = card.title === '高频追问';
    const pages = paginateBullets(bullets, isFollowUp);
    return { card, pages, sectionIndex };
  });

  const total = cardPages.reduce((sum, cp) => sum + cp.pages.length, 0);
  const items: RenderItem[] = [];
  let pageNumber = 1;

  for (const cp of cardPages) {
    let bulletOffset = 0;
    for (let i = 0; i < cp.pages.length; i++) {
      const pageBullets = cp.pages[i];
      items.push({
        key: cp.pages.length > 1 ? `${cp.card.id}-p${i + 1}` : cp.card.id,
        card: cp.card,
        current: pageNumber++,
        total,
        sectionIndex: cp.sectionIndex,
        bulletsToShow: pageBullets,
        bulletOffset
      });
      bulletOffset += pageBullets.length;
    }
  }

  return items;
}
