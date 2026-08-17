# Dota 2 群助手 AstrBot 插件

在 QQ 官方机器人群聊中绑定用户的 Dota 2 Steam 账号。插件通过 Web API 将绑定关系保存到 Dota 2 助手的 SQLite 数据库，并关联已有的玩家数据。

插件配置中的 `api_base_url` 默认是 `http://127.0.0.1:3000/api`。绑定前需要先在 Web 应用中同步对应玩家，否则绑定会失败。

## 指令

- `/bind <Steam64 ID 或短 ID>`：绑定账号，也可以使用 `/steam_bind` 或 `/绑定`。
- `/steam`：查询当前用户的绑定，也可以使用 `/我的steam` 或 `/steam查询`。
- `/unbind`：解除绑定，也可以使用 `/解绑`。

例如：

```text
/bind 76561198139459503
/bind 179193775
```

短 ID 会按照 Steam account ID 转换为对应的 Steam64 ID。插件仅处理 `qq_official` 的群聊消息。
