# 前端面试作答卡组生成器 架构说明（实现对齐版）

> 更新时间：2026-03-24
> 本文档以当前仓库实现为准，用于说明项目的真实分层、数据流、运行链路和当前约束。
> 如果本文档与旧设计描述冲突，以当前实现和本文档为准。

## 1. 产品目标

这是一个本地运行的前端知识点面试卡片生成器。

系统围绕单个前端知识点，生成一组可编辑、可保存、可导出的面试作答卡。核心目标不是“知识摘要”，而是输出一套更接近真实面试表达的卡组，帮助用户完成：

- 知道这个知识点是什么
- 知道它解决什么问题、为什么会被问
- 拿到一段可以直接复述的标准回答
- 预判高频追问
- 避开常见易错点

逻辑上的卡组始终固定为 4 个逻辑卡位，顺序固定：

1. `cover`：定义 + 它解决什么问题
2. `bullet-1`：完整面试回答
3. `bullet-2`：高频追问
4. `bullet-3`：易错点

## 2. 仓库结构

项目是一个 npm workspace monorepo，共 3 个包：

### 2.1 `shared`

职责：

- 定义共享类型
- 定义 `zod` schema
- 定义共享常量
- 提供少量通用工具函数

关键文件：

- `shared/src/types/index.ts`
- `shared/src/schema/index.ts`
- `shared/src/constants/index.ts`

### 2.2 `server`

职责：

- 暴露 REST API
- 调用 LLM 生成 Stage 1 / Stage 2 内容
- 校验生成结果
- 持久化 job、底稿、文档和导出结果
- 驱动 Playwright 导出 PNG

关键文件：

- `server/src/app.ts`
- `server/src/routes/jobs.ts`
- `server/src/services/generateDocument.ts`
- `server/src/services/validateTutorialDraft.ts`
- `server/src/services/validateCardCoverage.ts`
- `server/src/export/index.ts`
- `server/src/db/jobs.ts`

### 2.3 `web`

职责：

- 提供三栏工作台
- 提供卡组编辑器
- 提供实时预览
- 提供导出页

关键文件：

- `web/src/app/App.tsx`
- `web/src/stores/AppStore.ts`
- `web/src/pages/MainPage.tsx`
- `web/src/pages/ExportPage.tsx`
- `web/src/components/*`

## 3. 运行时拓扑

默认开发模式下：

- `web` 运行在 Vite dev server，默认端口 `5173`
- `server` 运行在 Express，默认端口 `3001`
- `web` 通过 Vite proxy 将 `/api/*` 转发到 `server`

前端路由使用 `HashRouter`：

- `/#/`：主工作台
- `/#/export/:jobId`：导出页

## 4. 核心数据模型

### 4.1 CardDocument

共享层定义的文档结构如下：

```ts
type CardType = 'cover' | 'bullet';

interface CoverCard {
  id: string;
  type: 'cover';
  title: string;
  subtitle: string;
  tag: string;
}

interface BulletCard {
  id: string;
  type: 'bullet';
  title: string;
  bullets: string[];
}

interface CardDocument {
  topic: string;
  styleVersion: 'frontend-card-v1';
  cards: [CoverCard, BulletCard, BulletCard, BulletCard] | Array<CoverCard | BulletCard>;
}
```

### 4.2 Job

服务端围绕 `Job` 做异步生成和导出：

```ts
type JobStatus =
  | 'generating'
  | 'validating'
  | 'ready'
  | 'ready_with_warnings'
  | 'exporting'
  | 'done'
  | 'failed';
```

Job 还会持有：

- `progressMessage`：阶段性进度文本
- `stage1Draft`：Stage 1 原始底稿
- `stage2Raw`：Stage 2 原始 JSON 字符串
- `documentJson`：最终结构化卡组
- `imagePaths`：导出后的公开路径
- `errorMessage`：失败原因或 warning 信息

## 5. 共享层约束

### 5.1 schema 约束

`CardDocumentSchema` 当前强约束：

- `styleVersion` 必须是 `frontend-card-v1`
- `cards.length` 必须是 `4`
- 第 1 张卡必须是 `cover`
- 第 2 到第 4 张卡必须是 `bullet`
- `cover.tag` 必须是 `前端面试卡`
- `cover.title <= 28`
- `cover.subtitle <= 90`
- `bullet.title <= 28`
- 每条 bullet `<= 220`

### 5.2 bullet 条数约束

这里有一层“schema 约束”和一层“业务理想值”的区别：

- schema 层允许每张 bullet 卡 `2~6` 条 bullets
- 编辑器交互层默认控制在 `3~6`
- 内容校验层把 `3~5` 视为理想范围，`2` 或 `6` 会更容易触发 warning 或边界判断

这意味着“固定 4 个逻辑卡位”是硬约束，但“每张 bullet 一定 3 条以上”在当前实现里不是最底层硬约束，而是偏业务规则和编辑器规则。

## 6. 服务端生成链路

### 6.1 入口

前端调用：

- `POST /api/jobs/generate`

服务端会：

1. 校验 `topic`
2. 创建 `Job`
3. 初始状态设为 `generating`
4. 立即返回 `job`
5. 通过后台异步任务继续执行生成

异步执行入口在 `runGenerationJob()`。

### 6.2 Stage 1：面试作答底稿

Stage 1 通过 LLM 生成固定结构的中文底稿，要求包含 6 个固定标题：

- 一句话定义：
- 它解决什么问题：
- 标准面试回答：
- 回答里的关键论据：
- 面试官最可能追问的 3-5 个问题：
- 这道题的易错点：

校验逻辑包括：

- 标题是否齐全
- 标题是否只出现一次
- 标题顺序是否正确
- 是否仍然围绕原 topic
- 标准回答长度是否在合理范围
- 标准回答是否像真实表达，而不是关键词堆砌
- 关键论据是否至少覆盖机制 / 代码 / 场景之一
- 高频追问与易错点的条数和长度是否合理

Stage 1 当前实现支持最多 2 次 retry。

### 6.3 Stage 2：装配 CardDocument

Stage 2 的职责不是重新写一篇文章，而是把 Stage 1 结构化结果装配成固定 4 个逻辑卡位的 JSON。

映射关系：

- `cover` ← `definition + problem`
- `bullet-1` ← `standardAnswer`，必要时吸收 `answerEvidence`
- `bullet-2` ← `followUpQuestions`
- `bullet-3` ← `pitfalls`

服务端会先做一轮归一化：

- 移除 HTML 和代码块标记
- 强制写回 `styleVersion`
- 强制写回固定 bullet 标题
- 补缺失 `id`
- 清洗 bullet 文本

Stage 2 当前实现支持：

- 首轮生成
- 1 次 retry
- 1 次 repair

### 6.4 Stage 2 校验分层

当前实现包含三层校验：

1. Schema 校验
2. 文本安全校验
3. 内容覆盖校验

其中内容覆盖校验会检查：

- `cover` 是否直接点明 topic
- `cover` 是否覆盖“定义 + 问题”
- `bullet-1` 是否真的形成可复述的标准回答
- `bullet-2` 是否像真实追问
- `bullet-3` 是否像真实易错点

最终状态：

- 完全通过：`ready`
- 可用但有提醒：`ready_with_warnings`
- 失败：`failed`

## 7. Prompt 组织

当前 prompt 分为两组：

- `server/src/prompts/tutorialPrompts.ts`
  - Stage 1 prompt
  - Stage 1 retry prompt
- `server/src/prompts/cardPrompts.ts`
  - Stage 2 prompt
  - Stage 2 retry prompt
  - repair prompt

当前实现原则：

- retry / repair 不是一句“请修复”
- Stage 2 / retry / repair 共用同一套结构规则和 JSON 骨架
- Prompt 显式强调 topic 锁定、长度规则、卡位职责和输出格式

## 8. LLM 接入

当前服务端通过 `server/src/llm/minimaxClient.ts` 统一访问 LLM。

现状：

- 默认 `baseUrl`：`https://api.minimax.io/v1`
- 默认模型：`MiniMax-M2.7`
- 请求接口：`POST /chat/completions`
- 会移除模型输出中的 `<think>...</think>`
- 支持 Stage 1 / Stage 2 分别指定模型

模型选择优先级：

- Stage 1：`LLM_STAGE1_MODEL` → `LLM_MODEL` → 默认模型
- Stage 2：`LLM_STAGE2_MODEL` → `LLM_MODEL` → 默认模型

## 9. 持久化与文件布局

### 9.1 SQLite

服务端使用 `better-sqlite3`，数据库文件位于：

- `storage/app.db`

或由 `APP_STORAGE_DIR` 指向的目录下。

表结构当前只有一张主表：`jobs`。

### 9.2 jobs 表字段

主要字段：

- `id`
- `topic`
- `status`
- `progress_message`
- `stage1_draft`
- `stage2_raw`
- `document_json`
- `image_paths_json`
- `error_message`
- `created_at`
- `updated_at`

### 9.3 兼容旧数据

读取 `document_json` 时，服务端会尝试做旧结构兼容：

- 兼容旧的 7 卡 / summary 类结构
- 兼容旧 bullet 标题
- 统一归一化成新的 4 卡 `CardDocument`

因此当前数据库读取层本身带有一层“迁移式归一化”。

### 9.4 导出产物目录

当前新导出目录不再使用 `jobId` 作为主目录名，而是使用“时间戳 + 清洗后的 topic”目录，并直接把图片写在 job 根目录下：

- `storage/jobs/<yyyy_mm_dd_hh_mm_ss_mmm>_<safeTopic>/Acover.png`
- `storage/jobs/<yyyy_mm_dd_hh_mm_ss_mmm>_<safeTopic>/bullet1.png`
- ...

其中 `safeTopic` 会保留中文、字母、数字，并把空格和非法路径字符清洗成下划线。读取和删除时仍保留对旧 `storage/jobs/<jobId>`、`storage/jobs/<timestamp>`、`storage/jobs/<timestamp>/images` 的兼容清理。

## 10. API 现状

当前后端已实现的接口如下：

- `GET /api/health`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `DELETE /api/jobs/:id`
- `POST /api/jobs/generate`
- `PUT /api/jobs/:id/document`
- `POST /api/jobs/:id/export`

接口职责：

- `generate`：创建 job 并异步生成卡组
- `document`：保存编辑后的 `CardDocument`
- `export`：把当前文档导出为图片
- `delete`：删除 job 及其导出产物

需要注意：

- `PUT /api/jobs/:id/document` 当前只做 schema 校验，不会重新执行 Stage 2 内容覆盖校验
- 保存编辑后的文档时，状态会直接写回 `ready`
- `errorMessage` 同时承载失败原因和 warning 信息

## 11. 前端架构

### 11.1 页面结构

主界面固定三栏：

- 左栏：输入、历史记录、保存、导出
- 中栏：固定 4 个逻辑卡位的编辑器
- 右栏：实时预览

导出页单独走 `/#/export/:jobId`。

### 11.2 状态管理

前端使用 MobX，核心 store 为 `web/src/stores/AppStore.ts`。

store 管理：

- 当前 job
- 当前可编辑草稿 `documentDraft`
- 历史记录
- 脏状态
- 生成中 / 导出中 / 保存中状态
- 错误信息

### 11.3 轮询机制

前端通过轮询感知后台异步任务状态：

- 生成中：每 1 秒轮询 `/api/jobs/:id`
- 导出中：每 1 秒轮询 `/api/jobs/:id`

### 11.4 编辑约束

当前编辑器是固定 4 个逻辑卡位的结构化编辑器：

- 不支持新增卡位
- 不支持删除卡位
- `cover` 可编辑 `title` / `subtitle`
- `bullet` 可编辑标题和 bullet 内容
- bullet 可增删条目，但 UI 默认控制在 `3~6`

`AppStore` 中仍保留了 `deleteCard/addCard/moveCard` 空方法，但当前产品层并不启用这些能力。

## 12. 预览与导出渲染

### 12.1 单一渲染源

预览和导出复用同一套卡片组件：

- `ExportCardView`
- `CoverCardView`
- `BulletCardView`

`CardPreview` 只是对导出视图做缩放包裹，不存在单独的“预览版卡片样式”。

### 12.2 逻辑卡与物理页的区别

逻辑文档固定 4 个逻辑卡位，但当前渲染层存在“动态展开”：

- `cover` 永远渲染为 1 页
- 任意 `bullet` 卡如果 bullets `>= 4`，会被拆成 2 个渲染页
- 拆分规则是：第一页固定前 3 条，剩余条目放到第二页

因此：

- 逻辑卡位始终是 4 个
- 实际预览页数和导出 PNG 数量可能是 4 到 7 张

这个展开逻辑由 `web/src/lib/expandCards.ts` 统一控制，预览和导出共用。

### 12.3 导出完成信号

导出页会通过全局变量向 Playwright 暴露状态：

- `window.__EXPORT_READY__`
- `window.__EXPORT_LAYOUT_OK__`
- `window.__EXPORT_CARD_COUNT__`

Playwright 只有在：

- 页面 ready
- 布局未溢出
- `.export-card` 数量和预期一致

时才会逐张截图。

## 13. 当前实现与原设计的差异

下面这些点不是未来规划，而是当前仓库里已经存在的真实差异，更新文档时需要明确记录：

### 13.1 导出目录已改为时间目录

旧设计文档中写的是：

- `storage/jobs/<jobId>/images`

当前实现实际是：

- `storage/jobs/<createdAt>_<safeTopic>/Acover.png`
- `storage/jobs/<createdAt>_<safeTopic>/bullet1.png`

### 13.2 API 实际多了健康检查和删除接口

当前实现比旧文档多出：

- `GET /api/health`
- `DELETE /api/jobs/:id`

### 13.3 固定 4 个逻辑卡位不等于导出 4 页

旧设计默认“4 张卡 = 4 页”。
当前实现里，渲染层允许 bullet 卡按条目数拆页，所以导出图片数可能大于 4。

### 13.4 编辑保存不会重跑完整语义校验

当前用户在前端编辑后，服务端保存接口只做 schema 级校验，不会重新验证“回答 / 追问 / 易错点”的内容职责是否仍然满足。

### 13.5 存在旧文档兼容层

数据库读取层已经承担了一部分旧版本文档向新 4 卡结构的兼容归一化，这部分属于实现事实，旧设计文档里没有体现。

## 14. 当前优先级与边界

当前版本的核心边界仍然是：

- 只做一套固定 4 个逻辑卡位的前端面试作答卡组
- 不做模板切换
- 不做在线 prompt 配置后台
- 不做复杂质量评分系统
- 不做多模型管理后台

当前最重要的架构目标仍然不是“扩展性最大化”，而是：

- 结构稳定
- 规则明确
- 生成可校验
- 编辑可保存
- 预览与导出一致

## 15. 后续文档维护原则

后续如果继续演进，请优先同步更新以下内容：

1. `shared` 中的类型和 schema 是否变化
2. `jobs` 表字段和状态机是否变化
3. 导出路径和导出页协议是否变化
4. 逻辑卡数量与渲染页数量的关系是否变化
5. 保存接口是否开始重跑语义校验
6. `docs/UI_SPEC.md` 与卡片子系统真实样式是否仍一致
