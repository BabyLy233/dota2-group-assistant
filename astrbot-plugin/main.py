import time
from urllib.parse import quote

from astrbot.api import AstrBotConfig, logger
from astrbot.api.event import AstrMessageEvent, filter
from astrbot.api.star import Context, Star, register

from .api_client import BackendRequestError, WebApiClient
from .command_gate import CommandGate
from .match_formatter import format_recent_matches, load_hero_names
from .steam import normalize_steam_id

COMMAND_COOLDOWN_SECONDS = 30
SYNC_COOLDOWN_SECONDS = 60


@register(
    "astrbot_plugin_dota2_group_assistant",
    "BabyLy233",
    "在 QQ 群中绑定和查询用户的 Dota 2 Steam 账号",
    "1.2.0",
    "https://github.com/BabyLy233/dota2-group-assistant",
)
class Dota2GroupAssistant(Star):
    def __init__(self, context: Context, config: AstrBotConfig):
        super().__init__(context)
        api_base_url = str(config.get("api_base_url", "http://127.0.0.1:3000/api"))
        request_timeout = float(config.get("request_timeout", 10) or 10)
        command_cooldown = max(
            5.0,
            float(config.get("command_cooldown", COMMAND_COOLDOWN_SECONDS) or 0),
        )
        self.sync_cooldown = max(
            10.0,
            float(config.get("sync_cooldown", SYNC_COOLDOWN_SECONDS) or 0),
        )
        self.api = WebApiClient(api_base_url, request_timeout)
        self.commands = CommandGate(command_cooldown)
        self._last_sync_at: dict[str, float] = {}
        self._hero_names = load_hero_names()

    @staticmethod
    def _user_id(event: AstrMessageEvent) -> str:
        return str(event.get_sender_id()).strip()

    async def _get_binding(self, event: AstrMessageEvent) -> dict[str, object]:
        user_id = quote(self._user_id(event), safe="")
        return await self.api.request("GET", f"/bindings/qq_official/{user_id}")

    async def _sync_binding(
        self,
        user_id: str,
        binding: dict[str, object],
    ) -> tuple[dict[str, object], bool]:
        _, steam_id, _ = self._player_text(binding)
        if not steam_id:
            raise BackendRequestError(502, "绑定数据中缺少 Steam ID")

        remaining = self.sync_cooldown - (
            time.monotonic() - self._last_sync_at.get(user_id, 0)
        )
        if remaining > 0:
            return binding, False

        synced_player = await self.api.request(
            "POST",
            f"/players/{quote(steam_id, safe='')}/sync",
        )
        self._last_sync_at[user_id] = time.monotonic()
        return synced_player, True

    @staticmethod
    def _player_text(body: dict[str, object]) -> tuple[str, str, str]:
        player = body.get("player")
        if not isinstance(player, dict):
            return "", "", ""
        return (
            str(player.get("name") or ""),
            str(player.get("steamId") or ""),
            str(player.get("accountId") or ""),
        )

    @filter.platform_adapter_type(filter.PlatformAdapterType.QQOFFICIAL)
    @filter.event_message_type(filter.EventMessageType.GROUP_MESSAGE)
    @filter.command("bind", alias={"steam_bind", "绑定"})
    async def bind(self, event: AstrMessageEvent, steam_id: str):
        """在 QQ 群中绑定 Steam64 或 Dota 短 ID。"""
        try:
            normalized_steam_id, account_id = normalize_steam_id(steam_id)
        except ValueError as exc:
            yield event.plain_result(
                f"绑定失败：{exc}\n用法：/bind <Steam64 ID 或短 ID>"
            )
            return

        try:
            body = await self.api.request(
                "POST",
                "/bindings",
                {
                    "platform": "qq_official",
                    "userId": self._user_id(event),
                    "steamId": normalized_steam_id,
                },
            )
        except BackendRequestError as exc:
            if exc.status == 404:
                message = "该账号还没有同步到 Dota 2 助手，请先在 Web 应用中同步玩家。"
            elif exc.status == 409:
                message = "该 Steam 账号已经被其他 QQ 用户绑定。"
            else:
                message = str(exc)
            yield event.plain_result(f"绑定失败：{message}")
            return

        player_name, bound_steam_id, bound_account_id = self._player_text(body)
        logger.info(
            "QQ user %s bound Steam account %s",
            event.get_sender_id(),
            normalized_steam_id,
        )
        yield event.plain_result(
            f"Steam 账号绑定成功：{player_name or '未知玩家'}\n"
            f"Steam64 ID：{bound_steam_id or normalized_steam_id}\n"
            f"短 ID：{bound_account_id or account_id}"
        )

        user_id = self._user_id(event)
        self._last_sync_at.pop(user_id, None)
        self.commands.clear(user_id, "sync")
        self.commands.clear(user_id, "recent")

    @filter.platform_adapter_type(filter.PlatformAdapterType.QQOFFICIAL)
    @filter.event_message_type(filter.EventMessageType.GROUP_MESSAGE)
    @filter.command("sync", alias={"同步"})
    async def sync(self, event: AstrMessageEvent):
        """同步当前 QQ 用户绑定账号的比赛数据。"""
        user_id = self._user_id(event)
        lock, rejection = await self.commands.begin(user_id, "sync")
        if rejection:
            yield event.plain_result(rejection)
            return

        try:
            binding = await self._get_binding(event)
            synced_player, did_sync = await self._sync_binding(user_id, binding)
            if did_sync:
                player_name = str(synced_player.get("name") or "当前账号")
                yield event.plain_result(f"{player_name} 的比赛数据同步完成。")
            else:
                yield event.plain_result(
                    f"该账号刚在 {int(self.sync_cooldown)} 秒内同步过，本次跳过重复请求。"
                )
        except BackendRequestError as exc:
            message = (
                "你还没有绑定 Steam 账号，请先使用 /bind <Steam64 ID 或短 ID>。"
                if exc.status == 404
                else str(exc)
            )
            yield event.plain_result(f"同步失败：{message}")
        finally:
            self.commands.finish(lock)

    @filter.platform_adapter_type(filter.PlatformAdapterType.QQOFFICIAL)
    @filter.event_message_type(filter.EventMessageType.GROUP_MESSAGE)
    @filter.command("recent", alias={"最近"})
    async def recent(self, event: AstrMessageEvent):
        """同步并发送当前 QQ 用户最近五场比赛。"""
        user_id = self._user_id(event)
        lock, rejection = await self.commands.begin(user_id, "recent")
        if rejection:
            yield event.plain_result(rejection)
            return

        try:
            binding = await self._get_binding(event)
            _, steam_id, _ = self._player_text(binding)
            if not steam_id:
                raise BackendRequestError(502, "绑定数据中缺少 Steam ID")

            sync_result, sync_error, did_sync = await self._sync_for_recent(
                user_id,
                binding,
            )
            binding_player = binding.get("player")
            binding_player_name = (
                str(binding_player.get("name") or "")
                if isinstance(binding_player, dict)
                else ""
            )
            player_name = str(sync_result.get("name") or binding_player_name)
            matches_body = await self.api.request(
                "GET",
                f"/players/{quote(steam_id, safe='')}/matches?page=1&pageSize=5",
            )
            result = format_recent_matches(
                player_name,
                steam_id,
                matches_body.get("items"),
                self._hero_names,
            )
            if sync_error:
                result = f"同步失败，以下为数据库中已有记录：{sync_error}\n" + result
            elif not did_sync:
                result = "近期已同步，跳过重复同步请求。\n" + result
            yield event.plain_result(result)
        except BackendRequestError as exc:
            message = (
                "你还没有绑定 Steam 账号，请先使用 /bind <Steam64 ID 或短 ID>。"
                if exc.status == 404
                else str(exc)
            )
            yield event.plain_result(f"获取最近比赛失败：{message}")
        finally:
            self.commands.finish(lock)

    async def _sync_for_recent(
        self,
        user_id: str,
        binding: dict[str, object],
    ) -> tuple[dict[str, object], str, bool]:
        try:
            sync_result, did_sync = await self._sync_binding(user_id, binding)
            return sync_result, "", did_sync
        except BackendRequestError as exc:
            if exc.status != 502:
                raise
            sync_result = binding.get("player")
            if not isinstance(sync_result, dict):
                sync_result = {}
            return sync_result, str(exc), False

    @filter.platform_adapter_type(filter.PlatformAdapterType.QQOFFICIAL)
    @filter.event_message_type(filter.EventMessageType.GROUP_MESSAGE)
    @filter.command("steam", alias={"我的steam", "steam查询"})
    async def steam(self, event: AstrMessageEvent):
        """查询当前 QQ 用户绑定的 Steam 账号。"""
        try:
            body = await self._get_binding(event)
        except BackendRequestError as exc:
            if exc.status == 404:
                yield event.plain_result(
                    "你还没有绑定 Steam 账号。\n用法：/bind <Steam64 ID 或短 ID>"
                )
            else:
                yield event.plain_result(f"查询绑定失败：{exc}")
            return

        player_name, bound_steam_id, bound_account_id = self._player_text(body)
        yield event.plain_result(
            f"当前绑定的 Steam 账号：{player_name or '未知玩家'}\n"
            f"Steam64 ID：{bound_steam_id}\n"
            f"短 ID：{bound_account_id or '-'}"
        )

    @filter.platform_adapter_type(filter.PlatformAdapterType.QQOFFICIAL)
    @filter.event_message_type(filter.EventMessageType.GROUP_MESSAGE)
    @filter.command("unbind", alias={"解绑"})
    async def unbind(self, event: AstrMessageEvent):
        """解除当前 QQ 用户的 Steam 账号绑定。"""
        user_id = quote(self._user_id(event), safe="")
        try:
            body = await self.api.request("DELETE", f"/bindings/qq_official/{user_id}")
        except BackendRequestError as exc:
            if exc.status == 404:
                yield event.plain_result("你当前没有 Steam 账号绑定。")
            else:
                yield event.plain_result(f"解除绑定失败：{exc}")
            return

        _, bound_steam_id, _ = self._player_text(body)
        self._last_sync_at.pop(self._user_id(event), None)
        yield event.plain_result(f"已解除 Steam 账号绑定：{bound_steam_id or '当前账号'}")

    async def terminate(self):
        """插件卸载时无需额外清理。"""
