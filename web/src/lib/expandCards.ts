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

const MAX_BULLETS_PER_PAGE = 3;
const MAX_USABLE_HEIGHT = 880; // 卡片垂直可用安全高度（扣除 Cover 和 Bento 导航）
const CHARS_PER_LINE = 27;     // 每行容纳的中文字数 (可用宽 ~800px / 字号 30px)
const LINE_HEIGHT_PX = 49.5;   // 单行像素高 (30px * 1.65)
const BULLET_MARGIN_PX = 54;   // 结构性外框占用的垂直间距

/**
 * 计算一段文本放入 DOM 渲染后所需的物理像素高度
 */
function estimateBulletHeight(text: string, isFollowUp: boolean): number {
  let height = BULLET_MARGIN_PX;
  
  if (isFollowUp && (text.includes('？') || text.includes('?'))) {
    // 触发了追问卡片的“问答分涂”特效渲染，加上分割间的 10px 惩罚
    const lines = Math.ceil(text.length / CHARS_PER_LINE);
    height += lines * LINE_HEIGHT_PX + 10;
    return height;
  }

  const lines = Math.ceil(text.length / CHARS_PER_LINE);
  height += lines * LINE_HEIGHT_PX;
  return height;
}

/** 
 * 动态安全拆页：基于物理 DOM 高度确保页面内容不溢出
 */
function paginateBullets(bullets: string[], isFollowUp: boolean): string[][] {
  const pages: string[][] = [];
  let currentPage: string[] = [];
  let currentHeight = 0;

  for (const b of bullets) {
    const itemHeight = estimateBulletHeight(b, isFollowUp);
    
    // 裂变条件：如果塞入这条会物理撑爆屏幕、或者达到了限制上限
    if (currentPage.length > 0 && (currentPage.length >= MAX_BULLETS_PER_PAGE || currentHeight + itemHeight > MAX_USABLE_HEIGHT)) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    
    currentPage.push(b);
    currentHeight += itemHeight;
  }
  
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }
  
  if (pages.length === 0) {
    pages.push([]);
  }

  return pages;
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
