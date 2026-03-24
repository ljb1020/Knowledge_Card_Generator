import type { CardDocument } from 'shared';

/**
 * 生成小红书笔记标题。
 * 格式：前端面试卡-{topic}
 */
export function formatXhsTitle(topic: string): string {
  return `前端面试卡-${topic}`;
}

/**
 * 生成小红书笔记正文。
 */
export function formatXhsContent(document: CardDocument): string {
  const { topic } = document;
  return `#前端面试 #春招\n前端面试遇到面试官问${topic}，这样回答才能拿满分`;
}
