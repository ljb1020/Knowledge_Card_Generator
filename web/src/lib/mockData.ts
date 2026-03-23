import type { Job, CardDocument } from 'shared';

export const MOCK_DOCUMENT: CardDocument = {
  topic: '闭包',
  styleVersion: 'frontend-card-v1',
  cards: [
    {
      id: 'card-1',
      type: 'cover',
      title: '深入理解闭包',
      subtitle: 'JavaScript 中最强大又最容易被误解的概念',
      tag: '前端知识点',
    },
    {
      id: 'card-2',
      type: 'bullet',
      title: '什么是闭包',
      bullets: [
        '闭包是指函数能够访问其词法作用域外部的变量',
        '当内部函数引用了外部函数的变量，就形成了闭包',
        '即使外部函数已经执行完毕，这些变量依然被保留',
      ],
    },
    {
      id: 'card-3',
      type: 'bullet',
      title: '闭包的典型应用',
      bullets: [
        '数据私有化：利用闭包创建私有变量',
        '函数工厂：返回携带不同参数的函数',
        '事件处理：在循环中正确绑定索引值',
      ],
    },
    {
      id: 'card-4',
      type: 'bullet',
      title: '常见误区',
      bullets: [
        '在循环中创建闭包导致变量共享问题',
        '过度使用闭包造成内存泄漏',
        '混淆作用域链与闭包的概念',
      ],
    },
    {
      id: 'card-5',
      type: 'summary',
      title: '总结',
      summary: '闭包是 JavaScript 的核心概念，理解它的工作原理对于编写高质量代码至关重要。掌握闭包，让你的代码更加优雅和强大。',
      cta: '持续学习，共同进步',
    },
  ],
};

export const MOCK_JOB: Job = {
  id: 'job_mock_001',
  topic: '闭包',
  status: 'ready',
  stage1Draft: null,
  stage2Raw: null,
  documentJson: MOCK_DOCUMENT,
  imagePaths: [],
  errorMessage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
