import type { CardDocument } from 'shared';
import { generateJobId } from 'shared';

export function generateMockDocument(topic: string): CardDocument {
  return {
    topic,
    styleVersion: 'frontend-card-v1',
    cards: [
      {
        id: `card_${Date.now()}_1`,
        type: 'cover',
        title: `深入理解${topic}`,
        subtitle: `${topic}的核心概念与实践应用`,
        tag: '前端知识点',
      },
      {
        id: `card_${Date.now()}_2`,
        type: 'bullet',
        title: `什么是${topic}`,
        bullets: [
          `${topic}是前端开发中的重要概念`,
          `理解其原理能帮助写出更好的代码`,
          `在实际项目中有广泛的应用场景`,
        ],
      },
      {
        id: `card_${Date.now()}_3`,
        type: 'bullet',
        title: `核心机制`,
        bullets: [
          `掌握核心机制是进阶的关键`,
          `结合实际场景理解更深刻`,
          `多实践多总结才能融会贯通`,
        ],
      },
      {
        id: `card_${Date.now()}_4`,
        type: 'summary',
        title: '总结',
        summary: `通过本篇内容的学习，相信你对${topic}有了更深入的理解。持续学习，不断实践，才能真正掌握这项技能。`,
        cta: '学以致用，共同进步',
      },
    ],
  };
}
