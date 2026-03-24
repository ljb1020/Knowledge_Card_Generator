import type { CardDocument, Job } from 'shared';

export const MOCK_DOCUMENT: CardDocument = {
  topic: '闭包',
  styleVersion: 'frontend-card-v1',
  cards: [
    {
      id: 'card-1',
      type: 'cover',
      title: '闭包',
      subtitle: '函数能访问定义时所在词法作用域中的变量，解决状态保留和延迟访问问题。',
      tag: '前端面试卡',
    },
    {
      id: 'card-2',
      type: 'bullet',
      title: '完整面试回答',
      bullets: [
        '闭包本质上是函数和它创建时词法作用域的组合，不是单独某个语法点。',
        '它的核心价值是让函数执行结束后，内部逻辑仍然可以访问之前定义的外部变量。',
        '前端里常见在事件回调、函数工厂、缓存封装和 React Hooks 等场景，用来保存状态或隔离数据。',
        '回答这题时最好补一句边界：闭包不是坏事，但不必要的长期引用会带来额外内存压力。',
      ],
    },
    {
      id: 'card-3',
      type: 'bullet',
      title: '高频追问',
      bullets: [
        '为什么外层函数执行结束后变量还不会消失？答题方向：说明词法环境仍然被内部函数引用。',
        '闭包和作用域链是什么关系？答题方向：闭包依赖词法作用域，但不等于作用域链本身。',
        'React Hooks 里哪些问题和闭包有关？答题方向：从事件回调、useEffect 和旧状态捕获切入。',
      ],
    },
    {
      id: 'card-4',
      type: 'bullet',
      title: '易错点',
      bullets: [
        '误区一：只要定义了内层函数就一定有闭包，关键还是看是否真正引用并保留了外层变量。',
        '误区二：闭包一定会导致内存泄漏，真正的问题是无用引用没有及时释放。',
        '误区三：把闭包和 this 绑定混为一谈，闭包解决变量访问，this 解决调用时上下文。',
      ],
    },
  ],
};

export const MOCK_JOB: Job = {
  id: 'job_mock_001',
  topic: '闭包',
  status: 'ready',
  progressMessage: null,
  stage1Draft: null,
  stage2Raw: null,
  documentJson: MOCK_DOCUMENT,
  imagePaths: [],
  errorMessage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
