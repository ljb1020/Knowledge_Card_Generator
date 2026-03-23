# 前端知识卡片生成器 系统设计定稿

## 1. 产品定义

这是一个**本地可视化知识卡片生成器**。

用户输入一个前端知识点，例如“闭包”“虚拟 DOM”“浏览器缓存”，系统完成以下流程：

1. 调用 LLM 生成一份知识讲解草稿
2. 再调用 LLM 把草稿转成结构化分页卡片
3. 在 React 页面中可视化预览
4. 用户可以做轻量编辑
5. 用户点击导出
6. 后端用 Playwright 打开纯导出页，逐张截图
7. 输出多张 `1080 × 1440` 的 PNG 图片

---

## 2. 设计目标

这个系统第一版要解决的问题是：

- 输入一个知识点，自动生成适合社交媒体发布的多张纯文字知识卡片
- 内容结构标准化，视觉模板统一
- 支持人工微调
- 支持本地持久化和历史查看
- 支持一键导出图片

---

## 3. 非目标

第一版不做以下内容：

- 多模板系统
- 多风格切换
- 自动发布到社交媒体
- 批量主题队列
- 云端协作
- 登录/权限系统
- 自定义尺寸
- 自定义字体上传
- 代码块卡片
- 图标/插画/图片混排
- Electron 桌面端封装

---

## 4. 技术栈

## 前端

- Vite
- React
- TypeScript
- Tailwind CSS
- React Router
- MobX
- mobx-react-lite
- 原生 `fetch`

## 后端

- Node.js
- Express
- Zod
- Playwright
- SQLite
- better-sqlite3

## 共享层

- TypeScript 类型
- Zod schema
- Prompt 模板
- 通用工具函数

---

## 5. 项目目录结构

```text
project/
  web/
    src/
      app/
      components/
      pages/
      routes/
      stores/
      lib/
      styles/
      types/
    index.html
    vite.config.ts
    tailwind.config.ts

  server/
    src/
      app.ts
      routes/
      services/
      llm/
      db/
      export/
      prompts/
      utils/
    tsconfig.json

  shared/
    src/
      types/
      schema/
      constants/
      utils/

  storage/
    app.db
    jobs/
      <jobId>/
        images/
          01-cover.png
          02-bullet.png
          03-summary.png

  package.json
```

说明：

- `web`：React 可视化界面
- `server`：Express API、LLM 调用、导出逻辑
- `shared`：前后端共用类型和 schema
- `storage/app.db`：SQLite 数据库文件
- `storage/jobs/<jobId>/images`：导出图片目录

---

## 6. 路由设计

## 前端页面路由

- `/`：主操作台
- `/export/:jobId`：纯导出页

## 后端 API 路由

- `POST /api/jobs/generate`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `PUT /api/jobs/:id/document`
- `POST /api/jobs/:id/export`

---

## 7. 页面结构

主页面 `/` 使用三栏布局。

## 左栏：输入与操作区

固定内容：

- 知识点输入框
- 生成内容按钮
- 重新生成按钮
- 导出图片按钮
- 当前 Job 状态
- 最近历史 Job 列表

规则：

- 没有当前 document 时，导出图片按钮禁用
- 当前有未保存修改时，显示未保存提示
- 点击历史 Job，会加载该 Job 的 document 到编辑区和预览区

## 中栏：结构化编辑区

展示当前 document 的卡片列表，每张卡片一个编辑面板。

每张卡片面板允许：

- 编辑标题
- 编辑副标题
- 编辑总结内容
- 编辑 CTA
- 编辑 bullet 文本
- 中间 bullet 卡片可上移/下移
- 中间 bullet 卡片可删除
- 可新增 bullet 卡片

限制：

- cover 和 summary 不允许删除
- 不允许修改卡片类型
- 不允许新增第二张 cover
- 不允许新增第二张 summary

## 右栏：实时预览区

显示当前 document 的最终视觉效果预览，纵向排列。

要求：

- 预览必须与导出页复用同一套卡片组件和样式
- 不允许存在两套独立视觉逻辑

---

## 8. 编辑规则

document 的结构规则固定如下：

- 总页数必须在 `4 ~ 8`
- 第 1 页必须是 `cover`
- 最后 1 页必须是 `summary`
- 中间页只能是 `bullet`

用户编辑权限如下：

## 允许

- 改所有卡片的文字内容
- 调整中间 `bullet` 卡片顺序
- 删除中间 `bullet` 卡片
- 在最后一张 `summary` 前新增 `bullet` 卡片

## 不允许

- 修改卡片类型
- 删除 `cover`
- 删除 `summary`
- 把 `cover` 移到中间
- 把 `summary` 移到中间
- 总页数低于 4 或高于 8

---

## 9. 卡片类型

第一版只允许三种卡片类型。

## 9.1 `cover`

字段：

- `id`
- `type`
- `title`
- `subtitle`
- `tag`

用途：封面页

## 9.2 `bullet`

字段：

- `id`
- `type`
- `title`
- `bullets`

用途：正文知识点页

## 9.3 `summary`

字段：

- `id`
- `type`
- `title`
- `summary`
- `cta`

用途：总结/收尾页

---

## 10. TypeScript 数据结构

```ts
export type CardType = "cover" | "bullet" | "summary";

export interface CoverCard {
	id: string;
	type: "cover";
	title: string;
	subtitle: string;
	tag: string;
}

export interface BulletCard {
	id: string;
	type: "bullet";
	title: string;
	bullets: string[];
}

export interface SummaryCard {
	id: string;
	type: "summary";
	title: string;
	summary: string;
	cta: string;
}

export type Card = CoverCard | BulletCard | SummaryCard;

export interface CardDocument {
	topic: string;
	styleVersion: "frontend-card-v1";
	cards: Card[];
}

export type JobStatus =
	| "generating"
	| "validating"
	| "ready"
	| "exporting"
	| "done"
	| "failed";

export interface Job {
	id: string;
	topic: string;
	status: JobStatus;
	stage1Draft: string | null;
	stage2Raw: string | null;
	documentJson: CardDocument | null;
	imagePaths: string[];
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
}
```

---

## 11. SQLite 设计

数据库只建一张业务表：`jobs`

```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  status TEXT NOT NULL,
  stage1_draft TEXT,
  stage2_raw TEXT,
  document_json TEXT,
  image_paths_json TEXT NOT NULL DEFAULT '[]',
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

规则：

- `document_json` 存完整 `CardDocument`
- `image_paths_json` 存字符串数组 JSON
- 不建 `cards` 子表
- 不建 `export_tasks` 表
- 导出状态直接写回 `jobs.status`

---

## 12. 环境变量

后端读取以下环境变量：

```env
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
SERVER_PORT=3001
WEB_PORT=5173
APP_STORAGE_DIR=./storage
```

说明：

- `LLM_BASE_URL`：OpenAI 兼容接口基地址
- `LLM_API_KEY`：模型 API Key
- `LLM_MODEL`：模型名
- `SERVER_PORT`：后端端口，默认 `3001`
- `WEB_PORT`：前端端口，默认 `5173`
- `APP_STORAGE_DIR`：存储目录，默认 `./storage`

---

## 13. 内容生成流程

生成流程是**同步接口**。

接口：`POST /api/jobs/generate`

请求：

```json
{
	"topic": "什么是闭包"
}
```

后端同步执行以下步骤：

### 步骤 1

创建 job 记录，`status = generating`

### 步骤 2

调用 LLM，生成阶段 1 草稿

### 步骤 3

调用 LLM，基于阶段 1 草稿生成阶段 2 `CardDocument JSON`

### 步骤 4

进入 `validating`

### 步骤 5

校验 document 结构和文本规则

### 步骤 6

如果校验失败，执行一次自动修正

### 步骤 7

修正成功则 `status = ready`，返回完整 job
修正失败则 `status = failed`，返回错误信息

### 响应

同步返回最终 job 数据，不做前端轮询生成状态。

---

## 14. 两阶段 Prompt 责任

## 阶段 1：知识讲解草稿

输入：`topic`

输出：普通文本草稿，必须包含以下逻辑块：

1. 这个知识点是什么
2. 为什么重要
3. 核心机制或关键点
4. 常见误区
5. 一句总结

阶段 1 输出不是最终展示内容，只作为阶段 2 输入。

## 阶段 2：卡片化

输入：

- `topic`
- 阶段 1 草稿
- 固定卡片规则

输出要求：

- 只输出 JSON
- 不允许 Markdown 代码块
- 不允许解释文字
- 必须符合 `CardDocument` 结构

---

## 15. 卡片内容规则

所有生成和编辑后的 document 必须满足以下规则：

## 页数

- 最少 4 页
- 最多 8 页

## cover

- `title`：最多 24 个汉字
- `subtitle`：最多 40 个汉字
- `tag`：固定填 `"前端知识点"`

## bullet

- `title`：最多 22 个汉字
- `bullets.length`：2 ~ 4 条
- 每条 bullet：最多 30 个汉字

## summary

- `title`：最多 22 个汉字
- `summary`：最多 80 个汉字
- `cta`：最多 24 个汉字

## 其他

- 不允许代码块
- 不允许 HTML
- 不允许 emoji
- 不允许列表嵌套
- 一张 bullet 页只讲一个核心点

---

## 16. 自动修正策略

自动修正只做一次。

触发条件包括：

- 页数不在 `4 ~ 8`
- 第一页不是 `cover`
- 最后一页不是 `summary`
- 中间页存在非 `bullet`
- 文本长度超限
- bullet 数量超限
- JSON 结构不合法

修正方式：

- 重新调用阶段 2 的修正版 prompt
- 输入原 topic、阶段 1 草稿、原始不合格 JSON、错误原因
- 要求模型严格按规则重写

如果修正后仍不合格：

- `status = failed`
- 保存 `stage1_draft`
- 保存 `stage2_raw`
- 不保存 `document_json`

---

## 17. 视觉模板

第一版只做一套浅色模板，样式固定，不做主题切换。

## 导出尺寸

- 宽：`1080px`
- 高：`1440px`

## 视觉风格

- 背景色：`#F8FAFC`
- 主文字色：`#0F172A`
- 次级文字色：`#475569`
- 强调色：`#2563EB`

## 字体

只允许系统字体栈，不引入外部字体文件：

```css
font-family:
	-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
	"Hiragino Sans GB", "Microsoft YaHei", sans-serif;
```

## 内边距

- 上：`88px`
- 左右：`72px`
- 下：`72px`

## 封面页

- title：`76px`，`font-weight: 800`
- subtitle：`32px`
- tag：`24px`

## 正文页

- title：`56px`，`font-weight: 700`
- bullet：`34px`
- line-height：`1.7`

## 总结页

- title：`56px`
- summary：`34px`
- cta：`28px`

## 页脚

每页右下角固定显示：

- 当前页码
- 总页数

格式：`01 / 06`

---

## 18. 渲染组件

前端实现以下组件：

- `CoverCardView`
- `BulletCardView`
- `SummaryCardView`
- `DocumentPreview`

`DocumentPreview` 负责根据 `card.type` 分发组件。

预览页和导出页必须复用同一套组件和样式，不允许复制两份视图逻辑。

---

## 19. 溢出检测

导出前，系统必须检测每张卡片是否发生文本溢出。

实现方式如下：

- 每张导出卡片根节点 class 固定为 `.export-card`
- 页面挂载完成后，前端脚本遍历每张 `.export-card`
- 对每张卡片的主内容容器检测：
    - `scrollHeight > clientHeight`
    - `scrollWidth > clientWidth`

- 只要任意一张卡片溢出，则：
    - `window.__EXPORT_LAYOUT_OK__ = false`

- 全部正常时：
    - `window.__EXPORT_LAYOUT_OK__ = true`

- 页面渲染完成后：
    - `window.__EXPORT_READY__ = true`

Playwright 导出前必须等待：

- `window.__EXPORT_READY__ === true`
- `window.__EXPORT_LAYOUT_OK__ === true`

如果布局检测失败，导出直接判失败，不截图，不允许导出截断内容的图片。

---

## 20. 导出流程

导出流程是**异步任务**。

接口：`POST /api/jobs/:id/export`

后端行为如下：

### 步骤 1

读取 job，要求 `status` 必须为 `ready` 或 `done`

### 步骤 2

把 `status` 改为 `exporting`

### 步骤 3

异步启动导出逻辑，不阻塞接口返回

### 步骤 4

接口立即返回：

```json
{
	"jobId": "<jobId>",
	"status": "exporting"
}
```

### 步骤 5

前端轮询 `GET /api/jobs/:id`

### 步骤 6

后端导出逻辑：

- 启动 Playwright Chromium
- 打开 `http://localhost:${WEB_PORT}/export/${jobId}`
- 等待 `__EXPORT_READY__`
- 校验 `__EXPORT_LAYOUT_OK__`
- 获取所有 `.export-card`
- 逐张截图
- 文件输出到 `storage/jobs/<jobId>/images/`

### 步骤 7

成功：

- `status = done`
- 更新 `image_paths_json`

失败：

- `status = failed`
- 记录 `error_message`

---

## 21. 图片命名规则

导出图片命名固定为：

- `01-cover.png`
- `02-bullet.png`
- `03-bullet.png`
- `04-summary.png`

规则：

- 两位数补零
- 后缀固定 `.png`
- 文件名中的类型取当前卡片 `type`

---

## 22. API 规格

## 22.1 生成内容

`POST /api/jobs/generate`

请求体：

```json
{
	"topic": "闭包"
}
```

成功响应：

```json
{
	"job": {
		"id": "job_xxx",
		"topic": "闭包",
		"status": "ready",
		"stage1Draft": "...",
		"stage2Raw": "...",
		"documentJson": {
			"topic": "闭包",
			"styleVersion": "frontend-card-v1",
			"cards": []
		},
		"imagePaths": [],
		"errorMessage": null,
		"createdAt": "...",
		"updatedAt": "..."
	}
}
```

## 22.2 获取历史列表

`GET /api/jobs`

返回最近 20 条，按 `updated_at desc` 排序。

## 22.3 获取单个 job

`GET /api/jobs/:id`

返回完整 job。

## 22.4 保存编辑后的 document

`PUT /api/jobs/:id/document`

请求体：

```json
{
	"document": {
		"topic": "闭包",
		"styleVersion": "frontend-card-v1",
		"cards": []
	}
}
```

规则：

- 服务端必须重新做 schema 校验
- 合法才保存
- 保存成功后：
    - `status` 置为 `ready`
    - 清空旧的 `error_message`

- 不自动导出

## 22.5 异步导出

`POST /api/jobs/:id/export`

返回：

```json
{
	"jobId": "job_xxx",
	"status": "exporting"
}
```

---

## 23. 前端状态管理

前端使用 MobX。

推荐实现：

- `AppStore`
- `JobStore`
- `EditorStore`

也可以合并成一个根 store，但对外暴露的职责必须清晰。

## 推荐状态结构

```ts
{
  currentJobId: string | null;
  currentJob: Job | null;
  documentDraft: CardDocument | null;
  isDirty: boolean;
  isGenerating: boolean;
  isExporting: boolean;
  historyJobs: Job[];
}
```

规则：

- `currentJob.documentJson` 表示服务端最新版本
- `documentDraft` 表示当前本地编辑版本
- 两者不一致时，`isDirty = true`

## MobX 约束

- store 使用 class + `makeAutoObservable`
- React 组件使用 `observer`
- 所有修改 documentDraft 的操作都通过 store action 完成
- 组件内部不直接改原始 job 对象
- 编辑区和预览区都从同一份 `documentDraft` 读取数据

---

## 24. 历史记录规则

左栏展示最近 20 条历史 Job。

点击历史 Job：

- 加载该 job 到中栏和右栏
- 如果当前有未保存修改，先弹确认框
- 用户确认后才切换

不做分页，不做搜索。

---

## 25. 运行方式

本地开发以一个仓库运行，使用一个根 `package.json` 管理脚本。

必须支持：

- `npm run dev`：同时启动前端和后端
- `npm run build`：构建前端与后端
- `npm run start`：启动生产构建版本

不要求打包桌面端。

---

## 26. 错误处理

## 生成失败

- 前端 toast 提示
- 中栏和右栏不更新
- 历史列表中保留该 failed job

## 保存失败

- 保持本地草稿不丢失
- 显示错误信息

## 导出失败

- 当前 document 不丢失
- 历史记录保留
- 用户可以再次点击导出

## 网络错误

- 前端统一 toast
- 不做自动重试

---

## 27. 安全边界

这是本地工具，第一版不做认证。
默认只绑定本机使用，不考虑公网暴露。

---

## 28. 开发顺序

开发顺序如下：

### 第 1 步

实现 `shared` 中的类型、Zod schema、常量

### 第 2 步

实现 `web` 主页面三栏布局和 mock 数据预览

### 第 3 步

实现 3 个卡片组件和 `/export/:jobId` 导出页

### 第 4 步

实现 `server` 中的 SQLite 初始化和 `jobs` 表

### 第 5 步

实现 `GET /api/jobs`、`GET /api/jobs/:id`、`PUT /api/jobs/:id/document`

### 第 6 步

实现 `POST /api/jobs/generate`，先用 mock LLM，再接真实 LLM

### 第 7 步

实现 Playwright 异步导出

### 第 8 步

接通真实前后端联调

---

## 29. 验收标准

系统达到第一版可用，必须满足以下条件：

## 生成

- 输入任意一个正常前端知识点
- 能同步返回一个合法 `CardDocument`
- 页数在 4~8
- 第一页是 cover
- 最后一页是 summary

## 编辑

- 用户可以改文字
- 可以调整中间 bullet 顺序
- 可以新增/删除中间 bullet
- 保存后重新打开仍保留

## 预览

- 右栏能实时显示最终效果
- 预览和导出页视觉一致

## 导出

- 点击导出后进入异步状态
- 导出成功后生成多张 PNG
- 图片路径写回 job
- 文本溢出时导出失败，不允许生成截断图

## 历史

- 能看到最近 20 条 job
- 能重新打开旧 job
- SQLite 中保留完整历史

---

## 30. 系统一句话定义

这是一个**基于 Vite + React + Tailwind + MobX + Express + SQLite + Playwright 的本地可视化前端知识卡片生成器，采用 OpenAI 兼容接口两阶段生成内容，用户可轻量编辑，最终通过纯导出页逐张截图输出 1080 × 1440 PNG。**
