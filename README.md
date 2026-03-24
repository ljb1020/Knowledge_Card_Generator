# Knowledge Card Generator

前端面试作答卡组生成器。输入一个前端知识点，通过 LLM 生成一组固定 4 张的面试卡片（封面卡 + 标准回答 + 高频追问 + 易错点），支持编辑、预览和导出 PNG。

## 项目结构

Monorepo，npm workspaces，三个子包：

- `shared` — 共享类型、Zod Schema、常量
- `server` — Express 后端，负责 LLM 调用、生成校验、SQLite 持久化、Playwright 截图导出
- `web` — React + MobX + Vite 前端，三栏编辑工作台 + 实时预览

## 运行方式

需要 Node.js >= 18。

```bash
npm install

# 编辑 .env，填入 MiniMax API Key
# LLM_API_KEY=your-key

npm run dev
```

前端跑在 `localhost:5173`，后端跑在 `localhost:3001`，Vite 会自动代理 `/api/*` 到后端。

其他命令：

```bash
npm run dev:web       # 只启动前端
npm run dev:server    # 只启动后端
npm run build         # 构建全部
npm run start         # 生产模式启动后端
```

## 环境变量（.env）

```
LLM_BASE_URL=https://api.minimaxi.com/v1
LLM_API_KEY=                # 必填，MiniMax API 密钥
LLM_MODEL=MiniMax-M2.7     # 默认模型
LLM_STAGE1_MODEL=          # 可选，Stage 1 专用模型
LLM_STAGE2_MODEL=          # 可选，Stage 2 专用模型
SERVER_PORT=3001
WEB_PORT=5173
APP_STORAGE_DIR=./storage
```

## 生成流程

1. **Stage 1**：LLM 生成面试底稿（定义、解决什么问题、标准回答、关键论据、追问、易错点），校验结构和内容质量，最多 retry 2 次
2. **Stage 2**：把底稿装配成 4 张卡的 JSON（`CardDocument`），做归一化和清洗，最多 retry 1 次 + repair 1 次
3. 三层校验：Schema → 文本安全 → 内容覆盖

生成完成后可在编辑器里调整内容，导出时通过 Playwright 逐张截图生成 PNG。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/jobs` | 任务列表 |
| GET | `/api/jobs/:id` | 任务详情 |
| POST | `/api/jobs/generate` | 创建并生成卡组 |
| PUT | `/api/jobs/:id/document` | 保存编辑后的文档 |
| POST | `/api/jobs/:id/export` | 导出 PNG |
| DELETE | `/api/jobs/:id` | 删除任务 |

## 文档

- `docs/ARCHITECTURE.md` — 详细架构说明
- `docs/UI_SPEC.md` — UI 规范
