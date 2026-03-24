import type { CardDocument } from 'shared';

export function generateMockDocument(topic: string): CardDocument {
  return {
    topic,
    styleVersion: 'frontend-card-v1',
    cards: [
      {
        id: `card_${Date.now()}_1`,
        type: 'cover',
        title: topic,
        subtitle: `${topic}是什么，它解决什么问题，为什么这是前端面试里的高频题。`,
        tag: '前端面试卡',
      },
      {
        id: `card_${Date.now()}_2`,
        type: 'bullet',
        title: '完整面试回答',
        bullets: [
          `${topic}先说本质定义，再说它解决的问题。`,
          '接着补机制、代码体现或业务场景中的至少一个论据。',
          '最后补一句边界和注意点，让回答更像真实面试表达。',
        ],
      },
      {
        id: `card_${Date.now()}_3`,
        type: 'bullet',
        title: '高频追问',
        bullets: [
          `面试官为什么会继续追问 ${topic} 的原理？`,
          `这题和相邻概念有什么区别？`,
          '落到真实代码里应该怎么解释才不空泛？',
        ],
      },
      {
        id: `card_${Date.now()}_4`,
        type: 'bullet',
        title: '易错点',
        bullets: [
          '不要只背定义而说不出工程价值。',
          '不要把相邻概念混成同一题。',
          '不要把绝对化结论当成面试标准答案。',
        ],
      },
    ],
  };
}
