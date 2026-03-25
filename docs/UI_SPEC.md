# UI 设计规范 (UI_SPEC)

> 本文档是知识卡片工厂前端 UI 的**唯一权威参考**。  
> 所有新增/修改的前端组件，必须严格遵循此规范。

## 1. 整体风格定位

**浅色、专业、克制的桌面工具台** + **赛博终端风卡片预览**。

- 工作台（左栏、中栏）：Apple 毛玻璃现代风，强调生产效率
- 卡片预览（右栏）：赛博终端极客风，强调视觉表现力
- 两者风格互不干扰，工作台禁止使用卡片的深色/霓虹元素

## 2. 布局

三栏固定布局：

| 区域 | 宽度 | 职责 |
|------|------|------|
| 左栏 | `340px` | 输入生成、历史记录、操作按钮 |
| 中栏 | `flex-1` | 结构化内容编辑器 |
| 右栏 | `flex-1` | 实时卡片预览 |

导出页：`/#/export/:jobId`，供 Playwright 无头截图使用

## 3. 设计 Token 字典

所有 token 定义在 `web/src/styles/globals.css`，组件中通过 `className` 引用。

### 3.1 区块标题

| Token | 类名 | 值 |
|-------|------|----|
| 区块标题 | `section-title` | `text-sm font-semibold text-slate-700` |

所有面板的 section header 统一使用 `section-title`。

### 3.2 按钮

| 类型 | 类名 | 适用场景 |
|------|------|---------|
| 基类 | `btn-base` | 不单独使用，被其他按钮继承 |
| 主按钮 | `btn-primary` | 生成、保存、导出 |
| 次要按钮 | `btn-secondary` | 错误详情、附加操作 |
| 幽灵按钮 | `btn-ghost` | 测模型、测账号 |
| 禁用态 | `btn-disabled` | 追加到任意按钮变体 |

**用法示例**：
```jsx
// 主按钮 + 颜色
<button className="btn-primary bg-[#007AFF] text-white hover:bg-[#006ee6]">
  生成图文卡片
</button>

// 禁用态
<button className="btn-primary btn-disabled">生成中...</button>

// 幽灵按钮
<button className="btn-ghost">测模型</button>
```

**颜色约定**：
| 功能 | 颜色 |
|------|------|
| 蓝色主操作 | `bg-[#007AFF]` (生成、保存) |
| 深色次操作 | `bg-slate-800` (导出) |
| 小红书操作 | `bg-[#ff2442]` (发布) |

### 3.3 输入框

| Token | 类名 | 值 |
|-------|------|----|
| 通用输入框 | `input-base` | 圆角 `xl`、indigo 焦点环、slate 边框 |

**例外**：PublishModal 输入框使用红色焦点（`focus:border-red-400`），因为它属于小红书语境。

### 3.4 表单标签

| Token | 类名 | 值 |
|-------|------|----|
| 标签 | `label-text` | `text-xs font-medium text-slate-500` |

### 3.5 面板容器

| Token | 类名 | 值 |
|-------|------|----|
| 毛玻璃面板 | `glass-panel` | 48px blur + 180% 饱和度 + 白色高光倒角 |
| 白色卡片区块 | (inline) | `bg-white/40 border border-white/60 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]` |

### 3.6 状态标签

| Token | 类名 |
|-------|------|
| 状态胶囊 | `status-pill` + Tailwind 色彩追加 |

状态颜色映射：

| 状态 | 背景 | 文字 |
|------|------|------|
| 生成中/校验中/导出中 | `blue-50` | `blue-600` |
| 待导出 | `amber-50` | `amber-600` |
| 有提醒 | `orange-50` | `orange-600` |
| 已完成 | `emerald-50` | `emerald-600` |
| 已发布 | `violet-50` | `violet-600` |
| 失败 | `red-50` | `red-600` |

## 4. 卡片子系统规范（赛博终端风）

> 仅适用于 `CoverCardView`、`BulletCardView`、`ExportCardView`

### 4.1 风格定位

70% 系统日志极客风 + 20% 科技光带 + 10% 终端绿高亮

### 4.2 导出尺寸

固定 `1080 × 1440`，bullet ≥ 4 条时自动拆为两张连续页

### 4.3 颜色体系

| 用途 | 值 |
|------|---|
| 终端背景 | `#030712` |
| 微网格纹 | `rgba(0,240,255,0.04)` |
| 霓虹主发光 | `#00F0FF` |
| 终端绿 | `#00FF41` |
| 主文字 | `#FFFFFF` / `#E0F4FF` |

## 5. 小红书发布按钮

发布按钮独立于设计 Token 体系，使用小红书品牌色：

| 状态 | 样式 |
|------|------|
| 默认 | `bg-[#ff2442] text-white` 实心红 |
| 已发布 | `bg-white text-[#ff2442] border-[#ff2442]/30` 描边红 |
| 发布中 | `bg-slate-100 text-slate-400` 禁用灰 |

## 6. 开发约束

> [!CAUTION]
> 以下规则是强制性的，所有 contributor（包括 AI）必须遵守。

1. **禁止在组件内硬编码尺寸/圆角/字号** — 必须引用 `globals.css` 中的工具类
2. **按钮只追加颜色** — 使用 `btn-primary bg-xxx text-xxx` 模式，不要重写 `py` / `rounded` / `text-sm`
3. **新增 Token 先改 `globals.css`** — 如果现有工具类不满足需求，先在 CSS 中定义新类，再在组件中使用
4. **UI 改动需同步更新本文档** — 任何涉及设计 Token 变更的 PR 必须同步更新 `UI_SPEC.md`
5. **卡片风格与工作台风格隔离** — 工作台不使用深色/霓虹色，卡片不使用 Apple 毛玻璃
