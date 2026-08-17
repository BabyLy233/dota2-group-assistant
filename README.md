# Dota 2 战报工具

基于 STRATZ API 的 Dota 2 比赛数据分析工具：查询玩家信息、比赛记录、详细战报，并使用 AI 生成分析报告（完整战报 + QQ 群简报）。

## 功能特性

- **玩家搜索与同步**：输入 Steam ID 同步玩家信息与最近 100 场比赛
- **比赛详情**：比分、BP 选禁、经济/经验领先曲线、胜率曲线、击杀时间线、10 名玩家完整数据（KDA、GPM、XPM、净收入、伤害、治疗、IMP、装备）
- **AI 战报分析**：
  - 完整战报：阵容评价、对线期、节奏转折、选手点评、胜负关键、改进建议
  - QQ 群简报：选手点评表格 + 甩锅与邀功，适合直接转发
  - 流式输出、结果本地缓存（避免重复分析）、简报与战报独立并发
  - 支持任意 OpenAI 兼容接口（DeepSeek、Kimi、通义千问、Ollama 等）
- **玩家数据图表**：胜率走势、GPM/XPM 趋势、KDA 比率（按基准线分色）、IMP 表现分
- **批量同步**：一键同步当页比赛详情，内置请求限流（本地滑动窗口 + STRATZ 配额追踪）
- **收藏玩家**：首页快速访问；**主题切换**：浅色/深色/跟随系统
- **工程化**：Vitest 单元测试、commitlint 提交检查、husky 钩子、oxfmt 统一格式

## 技术栈

| 层   | 技术                                                                                      |
| ---- | ----------------------------------------------------------------------------------------- |
| 后端 | Hono · SQLite（better-sqlite3 + Drizzle ORM）                                             |
| 前端 | React · Vite · TanStack Router / Query · Tailwind CSS v4 · shadcn/ui（Base UI）· Recharts |
| AI   | @tanstack/ai（OpenAI-Compatible Adapter）· 流式 SSE                                       |
| 工具 | pnpm monorepo · TypeScript · oxlint / oxfmt · Vitest · commitlint · husky                 |

## 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 11
- 系统 curl（STRATZ 传输层）

### 安装与启动

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp apps/server/.env.example apps/server/.env
# 编辑 apps/server/.env，填入 STRATZ_API_KEY（https://stratz.com 申请）
# 如果服务器直连 STRATZ 返回 403，可选配置 STRATZ_PROXY_URL 指向可用的代理出口
# 如需发送 QQ 群战报，在 AstrBot WebUI 创建含 im scope 的 API Key，并填入 ASTRBOT_API_KEY

# 3. 启动开发环境（自动清理占用端口）
pnpm dev
# 前端 http://localhost:5173 · 后端 http://localhost:3000
```

### AI 分析配置

进入页面右上角「智能分析」设置接口地址、密钥与模型名称（仅保存在本地浏览器）：

- DeepSeek: `https://api.deepseek.com/v1` · `deepseek-chat`
- Ollama 本地: `http://localhost:11434/v1` · `llama3.3`（密钥随意）

### QQ 群战报发送

后端通过 AstrBot HTTP API（`POST /api/v1/im/message`）发送简报至 QQ 群，配置项位于 `apps/server/.env`：

- `ASTRBOT_API_URL`：AstrBot 地址，默认 `http://localhost:6185`
- `ASTRBOT_API_KEY`：AstrBot WebUI 创建、且包含 `im` scope 的 API Key
- `ASTRBOT_QQ_GROUP_UMO`：目标群 UMO，默认 `aiocqhttp_default:GroupMessage:685470084`

## 常用命令

| 命令                            | 说明                                              |
| ------------------------------- | ------------------------------------------------- |
| `pnpm dev`                      | 启动前后端开发服务（自动清理 3000/5173 端口占用） |
| `pnpm build`                    | 构建所有包                                        |
| `pnpm plugin:pack`              | 将 AstrBot 插件打包为可导入的 ZIP 文件            |
| `pnpm test` / `pnpm test:watch` | 运行 Vitest 测试                                  |
| `pnpm typecheck`                | 全量类型检查                                      |
| `pnpm lint`                     | oxlint 检查                                       |
| `pnpm fmt` / `pnpm fmt:check`   | oxfmt 格式化（单引号、无分号、LF）                |
| `pnpm commit:check`             | 校验最近一次提交信息                              |

提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)（commit-msg 钩子强制检查，pre-commit 自动格式化与 lint）。

## 项目结构

```
├── apps/
│   ├── server/          # Hono 后端 + Drizzle ORM
│   │   ├── src/modules/ # stratz(API客户端/限流) · player · match · ai · constants
│   │   ├── src/db/      # schema 与迁移 (drizzle/)
│   │   └── scripts/     # STRATZ 冒烟测试
│   └── web/             # React 前端（路由/组件/图表）
├── packages/
│   └── shared/          # 共享类型与英雄中英映射
├── scripts/             # 端口清理等工具脚本
└── .husky/              # git 钩子（pre-commit / commit-msg）
```

## 数据与隐私

- 比赛数据来自 [STRATZ API](https://stratz.com)，内置本地限流与配额追踪
- AI 密钥仅保存在浏览器本地，不上传服务器
- 本地 SQLite 数据库位于 `apps/server/data/`（已 gitignore）

## 免责声明

本项目为个人学习用途，与 Valve 公司及 Dota 2 官方无任何关联。AI 生成的分析内容仅供参考。
