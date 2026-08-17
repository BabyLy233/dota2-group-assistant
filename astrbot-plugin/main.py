from urllib.parse import quote

import aiohttp
from astrbot.api import AstrBotConfig, logger
from astrbot.api.event import filter, AstrMessageEvent
from astrbot.api.star import Context, Star, register

STEAM64_OFFSET = 76561197960265728
MAX_ACCOUNT_ID = 0xFFFFFFFF


class BackendRequestError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def normalize_steam_id(value: str) -> tuple[str, int]:
    """将 Steam64 或 Dota 短 ID 统一转换为 Steam64 和 account ID。"""
    value = value.strip()
    if not value.isdigit():
        raise ValueError("ID 只能包含数字")

    number = int(value)
    if len(value) == 17:
        account_id = number - STEAM64_OFFSET
        if account_id < 0 or account_id > MAX_ACCOUNT_ID:
            raise ValueError("Steam64 ID 不在有效范围内")
    else:
        account_id = number
        if account_id > MAX_ACCOUNT_ID:
            raise ValueError("短 ID 不在有效范围内")

    steam_id = str(STEAM64_OFFSET + account_id)
    return steam_id, account_id


@register(
    "astrbot_plugin_dota2_group_assistant",
    "BabyLy233",
    "在 QQ 群中绑定和查询用户的 Dota 2 Steam 账号",
    "1.0.0",
    "https://github.com/BabyLy233/dota2-group-assistant",
)
class Dota2GroupAssistant(Star):
    def __init__(self, context: Context, config: AstrBotConfig):
        super().__init__(context)
        self.api_base_url = str(
            config.get("api_base_url", "http://127.0.0.1:3000/api")
        ).rstrip("/")
        self.request_timeout = float(config.get("request_timeout", 10) or 10)

    async def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, object] | None = None,
    ) -> dict[str, object]:
        url = f"{self.api_base_url}{path}"
        try:
            timeout = aiohttp.ClientTimeout(total=self.request_timeout)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.request(method, url, json=payload) as response:
                    try:
                        body = await response.json(content_type=None)
                    except (aiohttp.ClientError, ValueError):
                        body = {}
                    if response.status >= 400:
                        message = (
                            body.get("message")
                            if isinstance(body, dict)
                            else None
                        )
                        raise BackendRequestError(
                            response.status,
                            str(message or f"Web 应用返回 HTTP {response.status}"),
                        )
                    if not isinstance(body, dict):
                        raise BackendRequestError(502, "Web 应用返回了无效数据")
                    return body
        except BackendRequestError:
            raise
        except (aiohttp.ClientError, TimeoutError) as exc:
            raise BackendRequestError(503, f"无法连接 Dota 2 助手 Web 应用：{exc}") from exc

    @staticmethod
    def _user_id(event: AstrMessageEvent) -> str:
        return str(event.get_sender_id()).strip()

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
            body = await self._request(
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

    @filter.platform_adapter_type(filter.PlatformAdapterType.QQOFFICIAL)
    @filter.event_message_type(filter.EventMessageType.GROUP_MESSAGE)
    @filter.command("steam", alias={"我的steam", "steam查询"})
    async def steam(self, event: AstrMessageEvent):
        """查询当前 QQ 用户绑定的 Steam 账号。"""
        user_id = quote(self._user_id(event), safe="")
        try:
            body = await self._request("GET", f"/bindings/qq_official/{user_id}")
        except BackendRequestError as exc:
            if exc.status == 404:
                yield event.plain_result("你还没有绑定 Steam 账号。\n用法：/bind <Steam64 ID 或短 ID>")
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
            body = await self._request("DELETE", f"/bindings/qq_official/{user_id}")
        except BackendRequestError as exc:
            if exc.status == 404:
                yield event.plain_result("你当前没有 Steam 账号绑定。")
            else:
                yield event.plain_result(f"解除绑定失败：{exc}")
            return

        _, bound_steam_id, _ = self._player_text(body)
        yield event.plain_result(f"已解除 Steam 账号绑定：{bound_steam_id or '当前账号'}")

    async def terminate(self):
        """插件卸载时无需额外清理。"""
