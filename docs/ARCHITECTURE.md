# 前端面试作答卡组生成器 系统设计定稿（v4）

## 1. 产品定义

这是一个本地可视化的前端面试知识点卡片生成器。

它的目标不再是把知识点压缩成“摘要卡片”，而是围绕一个前端知识点，直接生成一组适合面试复习和临场作答的 **4 张面试作答卡**。

用户刷完这 4 张卡后，应该完成：

- 知道这个知识点是什么
- 知道它为什么重要、为什么会被问
- 拿到一段可以直接复述的标准面试回答
- 预判面试官最可能继续追问什么
- 避开最常见、最容易丢分的理解错误

---

## 2. 最终卡组定义

系统默认输出固定 4 张卡，顺序固定：

1. `cover`
   定义 + 解决的问题
2. `bullet-1`
   完整面试回答
3. `bullet-2`
   面试官最可能追问的 3-5 个问题
4. `bullet-3`
   这道题的易错点

这 4 张卡的职责必须清晰，不允许再退化为泛泛总结。

---

## 3. 内容生成总流程

从用户输入 topic 到进入待导出状态，链路如下：

1. 前端提交知识点到 `POST /api/jobs/generate`
2. 服务端创建 job，状态记为 `generating`
3. Stage 1 生成“面试作答底稿”
4. Stage 1 校验并解析为结构化字段
5. Stage 2 把结构化底稿装配成 4 张卡的 `CardDocument`
6. Stage 2 做 schema 校验和内容覆盖校验
7. 成功后落库 `stage1Draft`、`stage2Raw`、`documentJson`
8. job 状态改为 `ready`
9. 前端加载 `documentJson`，进入可编辑、可导出状态

---

## 4. 阶段 1：面试作答底稿

### 4.1 目标

Stage 1 不再生成“教程型长稿”或“知识说明稿”，而是生成一份专门服务于 4 张面试卡的 **面试作答底稿**。

### 4.2 固定标题

Stage 1 必须输出以下固定标题，顺序固定，标题完全一致：

- 一句话定义：
- 它解决什么问题：
- 标准面试回答：
- 回答里的关键论据：
- 面试官最可能追问的 3-5 个问题：
- 这道题的易错点：

### 4.3 输出要求

- 所有内容必须使用简体中文
- 标题必须出现且仅出现一次
- 不能输出 JSON、Markdown 代码块、HTML
- 必须严格围绕用户输入的唯一知识点
- “标准面试回答”以 1 到 2 分钟口述长度为目标
- “标准面试回答”整体信息量目标约 300 到 600 字
- “回答里的关键论据”至少覆盖机制 / 代码 / 场景中的 1 类
- “面试官最可能追问的 3-5 个问题”必须稳定给出 3 到 5 个问题，整体信息量目标约 200 到 400 字
- “这道题的易错点”必须稳定给出 3 到 5 个易错点，整体信息量目标约 200 到 400 字

### 4.4 Stage 1 解析结构

服务端解析后得到：

```ts
type ParsedTutorialDraft = {
  definition: string;
  problem: string;
  standardAnswer: string;
  answerEvidence: string;
  followUpQuestions: string;
  pitfalls: string;
};
```

### 4.5 Stage 1 校验

至少包括：

- 标题完整
- 标题顺序正确
- 主题锁定正确，不能偷换题
- 标准面试回答非空，且达到足够的信息密度
- 标准面试回答不能只是关键词堆砌，要有表达顺序
- 回答里的关键论据至少覆盖机制 / 代码 / 场景中的 1 类
- 追问数量必须在 3 到 5 之间
- 易错点数量必须在 3 到 5 之间

---

## 5. 阶段 2：CardDocument 装配

### 5.1 目标

Stage 2 不负责重新发散生成一篇内容，也不负责“补课”。

Stage 2 的职责是把 Stage 1 的结构化底稿，稳定装配成固定 4 张卡的 `CardDocument JSON`。

### 5.2 映射关系

- `cover`
  优先来自 `definition + problem`
- `bullet-1`
  优先来自 `standardAnswer`，必要时吸收 `answerEvidence` 补强
- `bullet-2`
  优先来自 `followUpQuestions`
- `bullet-3`
  优先来自 `pitfalls`

### 5.3 输出结构

```json
{
  "topic": "闭包",
  "styleVersion": "frontend-card-v1",
  "cards": [
    {
      "id": "cover-1",
      "type": "cover",
      "title": "闭包",
      "subtitle": "……",
      "tag": "前端面试卡"
    },
    {
      "id": "bullet-1",
      "type": "bullet",
      "title": "完整面试回答",
      "bullets": ["……", "……", "……"]
    },
    {
      "id": "bullet-2",
      "type": "bullet",
      "title": "高频追问",
      "bullets": ["……", "……", "……"]
    },
    {
      "id": "bullet-3",
      "type": "bullet",
      "title": "易错点",
      "bullets": ["……", "……", "……"]
    }
  ]
}
```

---

## 6. CardDocument 约束

### 6.1 卡片数量

- 固定为 4 张
- 第 1 张必须是 `cover`
- 第 2 到第 4 张必须都是 `bullet`

### 6.2 文本长度

当前默认长度规则：

- `cover.title <= 28`
- `cover.subtitle <= 90`
- `bullet.title <= 28`
- 每张 `bullet` 卡 `3~6` 条 bullets
- 每条 bullet `<= 220`

### 6.3 内容约束

- 所有用户可见内容必须使用简体中文
- 不允许 HTML、Markdown、emoji、代码块
- `cover` 必须直接点明当前知识点
- `bullet-1` 必须像一段能说出口的标准回答
- `bullet-1` 总字数控制在 `300~600`
- `bullet-2` 必须体现真实追问，而不是随意列关键词
- `bullet-2` 总字数控制在 `200~400`
- `bullet-3` 必须体现易错点，而不是普通知识点补充
- `bullet-3` 总字数控制在 `200~400`

---

## 7. Stage 2 校验

Stage 2 至少包含三层校验：

### 7.1 Schema 校验

- JSON 结构合法
- 字段类型合法
- 卡片数量和顺序合法
- 字段长度合法

### 7.2 文本安全校验

- 去除非法 HTML
- 去除代码块
- 去除异常标记内容

### 7.3 内容覆盖校验

必须保证：

- `cover` 覆盖“定义 + 问题”
- `bullet-1` 覆盖 Stage 1 的“标准面试回答”素材，并统一输出为“完整面试回答”
- `bullet-2` 覆盖“追问”
- `bullet-3` 覆盖“易错点”

如果任一职责缺失，则判定 Stage 2 失败并进入 retry / repair。

### 7.4 分层校验策略

当前校验不是单纯的“一个字不对就失败”，而是分成三层：

- 硬校验
  结构错误、主题漂移、卡位职责缺失、JSON 不合法等，直接失败
- 软校验
  长度偏离理想范围、条数略多或略少、表达结构不够清晰等，记录为 warning
- 最终状态
  - 完全通过：`ready`
  - 可用但有提醒：`ready_with_warnings`
  - 不可用：`failed`

---

## 8. Prompt 设计

需要保留并维护以下 prompt：

- Stage 1 prompt
- Stage 1 retry prompt
- Stage 2 prompt
- Stage 2 retry prompt
- repair prompt

关键原则：

- retry 不能只写“请修复”
- repair 不能只写“请修复”
- retry / repair 必须完整复用结构规则、长度规则、内容覆盖规则
- Stage 2 / retry / repair 必须共享同一份 JSON 骨架模板

---

## 9. 前端编辑与导出

### 9.1 编辑器

编辑器默认围绕固定 4 张卡展开：

- 第 1 页：定义与价值
- 第 2 页：标准回答
- 第 3 页：高频追问
- 第 4 页：易错点

当前产品不再鼓励自由增删卡位，而是优先保证这 4 张卡的稳定结构。

### 9.2 导出

导出主链路保持不变：

- `POST /api/jobs/:id/export`
- Playwright 打开 `/#/export/:jobId`
- 等待卡片渲染完成
- 对每张 `.export-card` 截图
- 输出 PNG 到 `storage/jobs/<jobId>/images`

---

## 10. API

当前保留的接口：

- `POST /api/jobs/generate`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `PUT /api/jobs/:id/document`
- `POST /api/jobs/:id/export`

其中：

- `generate` 负责生成 4 张面试作答卡
- `document` 负责保存编辑后的 `CardDocument`
- `export` 负责把当前 `CardDocument` 导出为图片
- 当生成结果可用但存在软性偏差时，job 状态会是 `ready_with_warnings`
- `errorMessage` 字段会复用来承载失败原因或 warning 原因，文案需要具体到阶段和卡位

---

## 11. 环境变量

当前支持：

- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_STAGE1_MODEL`
- `LLM_STAGE2_MODEL`
- `SERVER_PORT`
- `WEB_PORT`
- `APP_STORAGE_DIR`

不做多模型管理后台，不做在线 prompt 管理器，保持最小可用实现。

---

## 12. 成功标准

这个版本的成功标准不是“生成一组看起来像知识卡的东西”，而是：

1. 用户输入一个前端知识点
2. 系统稳定生成 4 张固定顺序的面试作答卡
3. 第 2 张卡能直接支撑 1 到 2 分钟的标准回答
4. 第 3 张卡能稳定给出 3 到 5 个高频追问
5. 第 4 张卡能稳定给出 3 到 5 个高频易错点
6. 前端可编辑、可保存、可导出

---

## 13. 当前取舍

### 做了的

- 从 7 张速通卡切到 4 张面试作答卡
- Stage 1 改为面试作答底稿
- Stage 2 改为固定 4 张卡装配
- 校验逻辑改为围绕“回答 / 追问 / 易错点”
- 前端编辑器改为固定 4 张卡的编辑体验

### 暂不做

- 多套卡组模板切换
- 用户自定义 Stage 1 标题
- 复杂的质量评分系统
- 在线 prompt 配置后台

这版优先目标是：先把“面试作答卡组”这件事做准。 
