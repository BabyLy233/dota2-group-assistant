# Dota 2 群助手 AstrBot 插件

在 QQ 官方机器人群聊中绑定用户的 Dota 2 Steam 账号。插件通过 Web API 将绑定关系保存到 Dota 2 助手的 SQLite 数据库，并关联已有的玩家数据。

插件配置中的 `api_base_url` 默认是 `http://127.0.0.1:3000/api`。绑定前需要先在 Web 应用中同步对应玩家，否则绑定会失败。

## 指令

- `/bind <Steam64 ID 或短 ID>`：绑定账号，也可以使用 `/steam_bind` 或 `/绑定`。
- `/steam`：查询当前用户的绑定，也可以使用 `/我的steam` 或 `/steam查询`。
- `/unbind`：解除绑定，也可以使用 `/解绑`。
- `/sync`：同步当前绑定账号的比赛数据，也可以使用 `/同步`。
- `/recent`：同步后发送最近 5 场比赛，也可以使用 `/最近`。
- `/ai <对局ID>`：发送指定对局的 QQ 群简报；没有已生成简报时会先调用 AI 生成，也可以使用 `/简报` 或 `/战报`。
- `/match <比赛ID>`：发送指定比赛的 Markdown 数据表格，也可以使用 `/比赛`。

`/ai` 会先发送处理中提示，再等待后端返回简报，避免 AI 生成期间用户无法判断机器人是否收到指令。

例如：

```text
/bind 76561198139459503
/bind 179193775
```

短 ID 会按照 Steam account ID 转换为对应的 Steam64 ID。插件仅处理 `qq_official` 的群聊消息。

`/sync` 和 `/recent` 会限制同一用户的重复请求。默认相同指令冷却 30 秒，重复同步冷却 60 秒；`/recent` 在近期已经同步过时会跳过重复的 STRATZ 同步请求，只读取数据库中的最近比赛。

英雄中文名称使用插件内置的 `hero_names_zh.json` 映射，不会为了显示英雄名称额外请求 STRATZ。

AI 简报使用插件配置中的 `ai_base_url`、`ai_api_key`、`ai_model` 和 `ai_timeout`，需要填写 OpenAI 兼容接口配置。Web 端的 AI 配置保存在浏览器中，插件不会读取 Web 端设置。

插件代码按职责拆分为 `main.py`（指令入口）、`api_client.py`（Web API）、`command_gate.py`（请求限制）、`steam.py`（Steam ID 转换）和 `match_formatter.py`（比赛消息格式化）。
