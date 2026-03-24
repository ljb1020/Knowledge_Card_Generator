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

/** ≥4 条时：第一页固定 3 条，剩余放第二页 */
function splitBullets(bullets: string[]): [string[], string[]] {
  return [bullets.slice(0, 3), bullets.slice(3)];
}

/** 动态展开：≤3 条保持单页，≥4 条拆两页 */
export function expandCards(cards: Card[]): RenderItem[] {
  const needsSplit = (c: Card): boolean =>
    c.type === 'bullet' && (c as BulletCard).bullets.length >= 4;

  const total = cards.reduce((sum, c) => sum + (needsSplit(c) ? 2 : 1), 0);
  const items: RenderItem[] = [];
  let page = 1;

  cards.forEach((card, sectionIndex) => {
    if (card.type === 'cover') {
      items.push({ key: card.id, card, current: page++, total, sectionIndex: 0, bulletsToShow: [], bulletOffset: 0 });
    } else {
      const bullets = (card as BulletCard).bullets;
      if (bullets.length >= 4) {
        const [a, b] = splitBullets(bullets);
        items.push({ key: `${card.id}-a`, card, current: page++, total, sectionIndex, bulletsToShow: a, bulletOffset: 0 });
        items.push({ key: `${card.id}-b`, card, current: page++, total, sectionIndex, bulletsToShow: b, bulletOffset: a.length });
      } else {
        items.push({ key: card.id, card, current: page++, total, sectionIndex, bulletsToShow: bullets, bulletOffset: 0 });
      }
    }
  });

  return items;
}
