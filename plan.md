# Dota 2 战报获取工具 Plan

## 1. 项目目标

开发一个 **Dota 2 比赛数据获取与查看工具**，第一阶段暂不涉及 QQ 群机器人和 AI 战报生成，只负责：

1. 指定 Dota 2 玩家
2. 获取该玩家的比赛列表
3. 查看指定比赛的基本信息
4. 获取 STRATZ 已经解析完成的完整比赛数据
5. 将解析后的比赛数据保存到本地数据库
6. 通过 Web 页面查看这些数据
7. 为后续 AI 分析战报预留标准化数据结构

整体流程：

```text
Dota 2 玩家
    │
    ▼
Web 页面输入 Steam ID
    │
    ▼
后端查询 STRATZ API
    │
    ├── 玩家基本信息
    │
    └── 比赛列表
          │
          ▼
      选择一场比赛
          │
          ▼
    STRATZ Match API
          │
          ▼
    获取解析后的比赛数据
          │
          ▼
       本地数据库
          │
          ▼
       Web 战报详情
```

---

# 2. 第一阶段明确不做的功能

第一阶段控制项目范围，不实现：

- QQ 群机器人
- QQ 消息发送
- AI 分析
- AI 生成战报
- 自动发送战报
- QQ 群管理
- 多平台机器人
- 自动邀请/绑定玩家
- Dota 2 游戏内插件

这些功能后续可以在现有数据层之上增加。

---

# 3. 推荐技术架构

结合这个项目的需求，建议采用：

### 后端

**TypeScript + Node.js**

推荐：

- Fastify
- GraphQL Client / 原生 `fetch`
- Drizzle ORM
- PostgreSQL

或者如果希望项目简单一些：

- Hono
- Drizzle ORM
- SQLite

如果这个工具最终会长期运行，并且以后可能支持多个玩家、多个 QQ 群，建议直接使用 **PostgreSQL**。

### 前端

推荐：

- React
- Vite
- TanStack Router
- TanStack Query
- TypeScript
- Tailwind CSS
- shadcn/ui

项目本身非常适合 TanStack Query，因为：

```text
玩家
  ↓
比赛列表
  ↓
比赛详情
```

本身就是典型的服务端数据查询场景。

---

# 4. 项目结构

可以从一开始按照前后端分离设计：

```text
dota2-match-report/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── player/
│   │   │   │   └── match/
│   │   │   ├── lib/
│   │   │   └── main.tsx
│   │   └── package.json
│   │
│   └── server/
│       ├── src/
│       │   ├── modules/
│       │   │   ├── player/
│       │   │   ├── match/
│       │   │   └── stratz/
│       │   ├── db/
│       │   ├── config/
│       │   └── main.ts
│       └── package.json
│
├── packages/
│   └── shared/
│       └── src/
│           ├── player.ts
│           └── match.ts
│
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

---

# 5. STRATZ API 封装

后端首先实现一个独立的 STRATZ Client。

例如：

```text
StratzClient
├── getPlayer()
├── getPlayerMatches()
├── getMatch()
└── getMatchDetails()
```

不要让业务代码直接调用 STRATZ。

也就是说：

```text
MatchService
     │
     ▼
StratzClient
     │
     ▼
STRATZ API
```

而不是：

```text
MatchService
     │
     └──────直接调用 GraphQL
```

这样以后如果 STRATZ API 调整，主要只需要修改 `StratzClient`。

---

# 6. 玩家功能

第一阶段支持通过 Steam ID 查询玩家。

例如：

```text
Steam ID:
76561198xxxxxxxxx
```

后端：

```http
GET /api/players/:steamId
```

返回：

```json
{
  "steamId": "76561198xxxxxxxxx",
  "accountId": 123456789,
  "name": "PlayerName",
  "avatar": "...",
  "profileUrl": "..."
}
```

Web 页面：

```text
┌──────────────────────────────────────┐
│ Dota 2 玩家                          │
├──────────────────────────────────────┤
│ Steam ID                             │
│ [ 76561198xxxxxxxxx              ]  │
│                                      │
│              [ 查询 ]                │
└──────────────────────────────────────┘
```

查询成功以后进入玩家页面。

---

# 7. 玩家比赛列表

玩家页面：

```text
玩家头像  PlayerName
Steam ID: xxxxxxxxx

最近比赛

┌────────┬────────┬──────┬──────┬──────┬────────┐
│ 时间   │ 英雄   │ 结果 │ K/D/A│ 时长 │ Match  │
├────────┼────────┼──────┼──────┼──────┼────────┤
│ 14:32  │ Invoker│ 胜   │12/4/18│ 38m │ 123456 │
│ 12:05  │ Pudge  │ 负   │ 3/9/12│ 42m │ 123455 │
│ 昨天   │ Luna   │ 胜   │15/2/11│ 31m │ 123454 │
└────────┴────────┴──────┴──────┴──────┴────────┘
```

API：

```http
GET /api/players/:steamId/matches
```

支持：

```text
page
pageSize
```

以及后续可能增加：

```text
hero
result
dateFrom
dateTo
```

---

# 8. 比赛详情

点击比赛：

```text
GET /api/matches/:matchId
```

如果数据库已经存在：

```text
数据库
   ↓
直接返回
```

如果不存在：

```text
数据库
   ↓
没有
   ↓
STRATZ API
   ↓
获取解析后的比赛
   ↓
保存数据库
   ↓
返回
```

这是非常重要的一层缓存。

避免用户每次打开比赛都请求 STRATZ。

---

# 9. 比赛数据保存策略

不要简单地把 STRATZ 返回的整个 JSON 当成唯一数据。

建议：

### 核心字段结构化

例如：

```text
matches
├── id
├── start_time
├── duration
├── game_mode
├── lobby_type
├── winning_team
├── radiant_score
├── dire_score
├── parsed
├── created_at
└── updated_at
```

玩家比赛：

```text
match_players
├── match_id
├── steam_account_id
├── player_slot
├── hero_id
├── kills
├── deaths
├── assists
├── last_hits
├── denies
├── gpm
├── xpm
├── net_worth
├── hero_damage
├── tower_damage
├── healing
└── ...
```

同时建议保留：

```text
matches.raw_data
```

保存 STRATZ 原始 JSON。

这样后续发现：

> “AI 战报需要一个现在没有结构化保存的字段”

不用重新请求历史比赛。

---

# 10. 为什么要保存原始 JSON

这是整个项目比较重要的设计。

例如第一版只使用：

```json
{
  "kills": 10,
  "deaths": 3,
  "assists": 15
}
```

后面 AI 分析突然需要：

```text
技能升级顺序
装备购买时间
击杀时间线
Roshan
符文
对线数据
团战数据
地图行为
经济曲线
```

如果只保存结构化字段，就需要重新请求 STRATZ。

因此建议：

```text
matches
│
├── 常用字段
│
└── raw_data JSONB
        │
        └── STRATZ完整解析结果
```

这样后续 AI 层可以直接从 `raw_data` 提取数据。

---

# 11. “解析完成”状态

STRATZ 数据可能存在解析延迟，因此数据库应该记录：

```text
status
```

例如：

```text
PENDING
PROCESSING
COMPLETED
FAILED
```

流程：

```text
发现比赛
   ↓
PENDING
   ↓
请求 STRATZ
   ↓
解析完成？
 ┌─┴─┐
否  是
│    │
↓    ↓
继续等待 COMPLETED
```

同时保存：

```text
last_fetch_at
fetch_attempts
error_message
```

方便后续做自动重试。

---

# 12. 自动发现新比赛

虽然第一阶段主要是“查看比赛”，但建议从数据库设计上直接支持自动同步。

例如：

```text
POST /api/players/:steamId/sync
```

执行：

```text
查询 STRATZ
     ↓
获得最近比赛
     ↓
检查 match_id
     ↓
数据库不存在？
     ↓
创建比赛
     ↓
获取完整 Match 数据
     ↓
保存
```

以后就可以非常容易地加：

```text
定时任务
   ↓
每 1 分钟
   ↓
同步所有关注玩家
```

这样以后实现 QQ 机器人时就不需要重新设计数据同步系统。

---

# 13. Web 页面

第一阶段建议做 3 个主要页面。

## 玩家搜索页

```text
/
```

功能：

```text
Steam ID
    ↓
查询
```

---

## 玩家比赛页

```text
/players/:steamId
```

显示：

- 玩家信息
- 最近比赛
- 胜负
- 英雄
- K/D/A
- GPM
- XPM
- 比赛时间
- 比赛时长

支持分页。

---

## 比赛详情页

```text
/matches/:matchId
```

第一版可以分成：

### Overview

```text
比赛结果
比赛时长
游戏模式
Radiant / Dire
```

### Players

```text
玩家
英雄
K/D/A
GPM
XPM
Net Worth
Damage
Healing
```

### Build

```text
技能升级
装备
物品购买时间
```

### Raw Data

开发阶段非常有用：

```json
{
  ...
}
```

直接查看 STRATZ 原始数据。

---

# 14. 前端数据请求

使用 TanStack Query：

```text
usePlayer(steamId)

usePlayerMatches(steamId)

useMatch(matchId)
```

例如：

```text
usePlayerMatches
        │
        ▼
GET /api/players/:steamId/matches
```

比赛详情：

```text
useMatch
    │
    ▼
GET /api/matches/:matchId
```

这样后面添加：

```text
自动刷新
缓存
重新获取
分页
Prefetch
```

都比较方便。

---

# 15. 后端 API 第一版

建议最终先控制在这些 API：

```text
GET  /api/players/:steamId

GET  /api/players/:steamId/matches

GET  /api/matches/:matchId

POST /api/players/:steamId/sync

POST /api/matches/:matchId/sync
```

其中：

### 查询玩家

```http
GET /api/players/{steamId}
```

### 查询比赛

```http
GET /api/players/{steamId}/matches
```

### 获取比赛

```http
GET /api/matches/{matchId}
```

### 手动同步玩家

```http
POST /api/players/{steamId}/sync
```

### 手动重新获取比赛

```http
POST /api/matches/{matchId}/sync
```

`sync` 接口对于开发阶段非常有用。

---

# 16. 数据库核心表

第一版建议至少：

```text
players
matches
match_players
```

关系：

```text
players
   │
   │ steam_account_id
   │
   ▼
match_players
   │
   │ match_id
   ▼
matches
```

以后可以扩展：

```text
heroes
items
abilities
match_events
match_team_fights
```

但**第一阶段不要过早拆这些表**。

先把 STRATZ 的完整数据保存下来。

---

# 17. 第一阶段开发顺序

建议严格按照下面顺序实现。

### Phase 1：项目初始化

```text
[ ] 创建 pnpm monorepo
[ ] 创建 web
[ ] 创建 server
[ ] 创建 shared
[ ] 配置 TypeScript
[ ] 配置 Oxlint Oxfmt
[ ] 配置环境变量
```

---

### Phase 2：STRATZ Client

```text
[ ] 配置 STRATZ API Token
[ ] 实现 GraphQL Client
[ ] 实现 getPlayer()
[ ] 实现 getPlayerMatches()
[ ] 实现 getMatch()
[ ] 处理 API 错误
[ ] 处理 rate limit
```

这一阶段可以完全不做前端，先用 API 测试。

---

### Phase 3：数据库

```text
[ ] PostgreSQL
[ ] Drizzle ORM
[ ] players
[ ] matches
[ ] match_players
[ ] raw_data JSONB
[ ] 数据库 migration
```

---

### Phase 4：比赛同步

```text
[ ] 同步玩家
[ ] 同步比赛列表
[ ] 判断比赛是否已经存在
[ ] 获取完整 Match
[ ] 保存 Match
[ ] 保存 Match Players
[ ] 记录解析状态
[ ] 失败重试
```

---

### Phase 5：REST API

```text
[ ] GET player
[ ] GET player matches
[ ] GET match
[ ] POST player sync
[ ] POST match sync
```

到这里后端基本完成。

---

### Phase 6：Web

```text
[ ] 玩家搜索
[ ] 玩家信息
[ ] 比赛列表
[ ] 比赛详情
[ ] 玩家数据
[ ] 比赛数据
[ ] 原始 JSON 查看
```

---

### Phase 7：体验优化

```text
[ ] Loading
[ ] Error
[ ] Empty
[ ] Pagination
[ ] Match 缓存
[ ] 手动刷新
[ ] STRATZ 数据解析状态
```

---

# 18. 后续第二阶段

第一阶段完成以后，再增加：

```text
                ┌──────────────┐
                │ Match 数据库 │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │  AI Analyzer │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │  战报生成器  │
                └──────┬───────┘
                       │
                       ▼
                ┌──────────────┐
                │ QQ Bot       │
                └──────────────┘
```

AI 层可以根据比赛数据生成：

```text
比赛总结

胜负分析

对线表现

经济曲线

团战表现

出装分析

技能加点分析

关键失误

关键决策

做得好的地方

下一局建议
```

然后 QQ Bot 只负责：

```text
监听 QQ 群消息
       ↓
识别玩家
       ↓
获取最近比赛
       ↓
调用 AI
       ↓
发送战报
```

这样 **STRATZ 数据层、AI 分析层、QQ 机器人层完全解耦**。

---

# 19. 最终建议的整体架构

最终可以演进成：

```text
                         ┌──────────────┐
                         │   STRATZ     │
                         └──────┬───────┘
                                │
                                ▼
                      ┌──────────────────┐
                      │ Match Sync       │
                      │ Service          │
                      └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │    PostgreSQL    │
                      │                  │
                      │ Players          │
                      │ Matches          │
                      │ Match Players    │
                      │ Raw STRATZ Data  │
                      └────────┬─────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
             ┌─────────────┐       ┌─────────────┐
             │ Web Frontend│       │ AI Analyzer │
             └─────────────┘       └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ Report      │
                                   │ Generator   │
                                   └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ QQ Bot      │
                                   └─────────────┘
```

**第一阶段的核心目标可以进一步收缩成一句话：**

> **先把 STRATZ → 本地数据库 → Web 比赛详情 这条链路完整跑通，并且原始解析数据完整保存下来。**

这样后面无论是接 AI、QQ Bot，还是增加自动监控，都不需要推翻前面的架构。
