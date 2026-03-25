# 前端面试作答卡组生成器 架构说明（实现对齐版）

> 更新时间：2026-03-25
> 本文档以当前仓库实现为准，用于说明项目的真实分层、数据流、运行链路和当前约束。

## 1. 产品目标

这是一个本地运行的前端知识点面试卡片生成器。

系统围绕单个前端知识点，生成一组可编辑、可保存、可发布的小红书风格图文卡组。目标是输出一套接近真实面试表达的卡组，帮助用户完成：

- 知道这个知识点是什么
- 知道它解决什么问题、为什么会被问
- 拿到一段可以直接复述的标准回答
- 预判高频追问
- 避开常见易错点

默认逻辑卡位固定为 4 个（支持由条目过多而自动拆分出来的更多物理页）：

1. `cover`：定义 + 它解决什么问题
2. `bullet-1`：完整面试回答
3. `bullet-2`：高频追问
4. `bullet-3`：易错点

## 2. 仓库结构

项目是一个 npm workspace monorepo，共 3 个包：

### 2.1 `shared`

职责：
- 定义共享类型（CardDocument, JobStatus 等）
- 定义 `zod` schema
- 定义共享常量
- 提供通用工具函数（如 ID 生成）

### 2.2 `server`

职责：
- 暴露 REST API
- 调用 LLM (MiniMax) 生成面试底稿与卡组结构
- 校验生成结果的格式与内容
- 持久化 job 状态追踪至 sqlite
- 驱动 Playwright 导出页面截图
- **负责将导出卡组一键自动发布到小红书平台**（基于 Playwright，支持本地 cookie 授权）

### 2.3 `web`

职责：
- 提供基于 React/MobX 的桌面级工具台（Apple 风格毛玻璃）
- 提供结构化卡组编辑器
- 提供具有**赛博终端风 (Cyber Terminal)** 的实时卡片预览
- 提供用于 Playwright 截图的纯卡片导出页

## 3. 运行时拓扑

开发模式下：
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

### 4.2 Job 与 JobStatus

服务端围绕 `Job` 做状态机流转：

```ts
type JobStatus =
  | 'generating'
  | 'validating'
  | 'ready'
  | 'ready_with_warnings'
  | 'exporting'
  | 'done'
  | 'published' // 新增小红书发布状态
  | 'failed';
```

Job 持有各阶段产物：`progressMessage`, `stage1Draft`, `stage2Raw`, `documentJson`, `imagePaths`，并在过程中记录异常。

## 5. 共享层约束

- `styleVersion` 必须是 `frontend-card-v1`
- `cards.length` 必须是 `4` (业务层)
- 第一张卡必须是 `cover`，且 `tag` 必须是 `前端面试卡`
- `cover.title <= 28`，`cover.subtitle <= 90`
- `bullet.title <= 28`，每条 bullet `<= 220` 字
- bullet 数量支持 `2~6` 条（UI 默认在少于 6 条时允许添加新 bullet）

## 6. 服务端生成与发布链路

### 6.1 入口 (`POST /api/jobs/generate`)

异步提交，立刻返回 jobId，前端通过轮询感知状态进度。

### 6.2 Stage 1 与 Stage 2 (LLM Pipeline)

- **Stage 1**: 生成面试底稿，包含一句话定义、价值、标准回答、追问、易错点。支持 2 次重试（Retry）。
- **Stage 2**: 把 Stage 1 解析后，装配并提炼成严格长度限制的 JSON 结构。支持 1 次 Retry 和 1 次专属的 Repair。
- Prompt 的组织现已重构，统一从 `prompts/generateDocument.ts` (代理 `tutorialPrompts.ts` 与 `cardPrompts.ts`) 引入。
- 校验仍包含三层：Schema 校验、文本安全校验（屏蔽 Markdown/HTML 标记）规则校验、生成质量/内容覆盖校验。

### 6.3 导出 (`POST /api/jobs/:id/export`)

使用无头浏览器（Playwright）打开前端 `/#/export/:jobId`。
- 监听页面抛出的三个全局可用变量 (`__EXPORT_READY__`, `__EXPORT_LAYOUT_OK__`, `__EXPORT_CARD_COUNT__`) 作为截图时机触发。
- 每张卡组件截图一张，保存到 `storage/jobs/<timestamp>_<topic>/`。

### 6.4 发布到小红书 (`POST /api/jobs/:id/publish-draft`)

核心自动化流：基于 `publish` 模块（`xhsAuth.ts`, `xhsPublisher.ts`）。
- 服务首先检查并准备登录态。若无 cookie (`storage/xhs-auth.json`)，弹出可见浏览器供用户扫码。
- 登录态备妥后，系统加载刚导出的 PNG 卡组。
- 自动拼接小红书笔记标题与正文（由 `contentFormatter.ts` 生成）。
- 操控 Playwright 跳转至小红书发布页进行自动化填表、图文上传与提交，状态变更为 `published`。

## 7. 存储持久化

服务端使用 `better-sqlite3`（数据库为 `storage/app.db`）。包含两套核心数据：
- `jobs` 表用于记录每次生成的记录。存在向后兼容层的 `document_json` 转换。
- 生成的 PNG 及运行日志与 debug 错误快照（如 Playwright 超时快照）也保存在 `storage` 中。

## 8. API 接口概览

- `GET /api/jobs` / `GET /api/jobs/:id`： 获取状态与历史记录
- `POST /api/jobs/generate`：触发生成任务，支持异常进度上报
- `PUT /api/jobs/:id/document`：手工修改文档数据并保存
- `POST /api/jobs/:id/export`：触发导出任务
- `DELETE /api/jobs/:id`：清理垃圾记录（也会清理导出的相关物理文件）
- **`GET /api/xhs/check-auth`**：校验并测试系统当前的小红书 cookie 有效性
- **`POST /api/jobs/:id/publish-draft`**：发起全自动化发布引擎至小红书平台

## 9. 前端架构细节

- **状态管理**：基于 MobX (`AppStore.ts`) 支持状态获取、保存、导出与触发发布 (`canPublishToXhs`, `publishToXhs()`)
- **逻辑页展开机制**：虽然 JSON 数据只有 4 个卡，但由于每页 bullet 大于等于 4 条会显得拥挤，前端实现了基于 `lib/expandCards.ts` 的自动分页逻辑：
  > 任意 bullet 数 `≥ 4`，会被拆解为两张独立的渲染展示页与导出图片（第一页放前 3 条，其余顺移）。这导致“导出图片总是 `≥ 4` 的”。

## 10. UI 设计系统

前端 UI 遵循统一的设计 Token 体系，详见 `docs/UI_SPEC.md`。

### 10.1 Token 唯一源泉

所有尺寸、圆角、字号、颜色等视觉规格，以 `web/src/styles/globals.css` 中定义的工具类为准：

- `section-title` — 区块标题
- `btn-primary` / `btn-secondary` / `btn-ghost` — 按钮变体
- `input-base` — 输入框
- `label-text` — 表单标签

### 10.2 开发约束

- **禁止在组件内硬编码 `py` / `rounded` / `text-sm` 等尺寸样式**，必须引用工具类
- **按钮只追加颜色差异**，不重写基础属性
- **新增 Token 先改 `globals.css`**，再在组件中引用
- **UI 改动需同步更新 `UI_SPEC.md`**

### 10.3 视觉风格隔离

- **工作台**（LeftPanel、CenterPanel）：Apple 毛玻璃浅色风
- **卡片预览**（CoverCardView、BulletCardView）：赛博终端深色风
- 两者风格严格隔离，互不侵入

## 11. 文档同步规则

> **任何系统改动（功能、架构、UI），必须同步更新对应文档。**

| 改动类型 | 需更新的文档 |
|---------|------------|
| API / 数据模型 / 服务端逻辑 | `ARCHITECTURE.md` |
| UI 组件 / 视觉风格 / 设计 Token | `UI_SPEC.md` + `ARCHITECTURE.md` |
| 新增功能模块 | `ARCHITECTURE.md` |
| 生成 Prompt / 校验规则 | `ARCHITECTURE.md` |

本文档必须始终与代码实现保持一致，不允许出现"文档描述与实际代码不符"的情况。
