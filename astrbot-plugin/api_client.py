import json

import aiohttp


class BackendRequestError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


class WebApiClient:
    def __init__(self, base_url: str, timeout_seconds: float):
        self.base_url = base_url.rstrip("/")
        self.timeout = aiohttp.ClientTimeout(total=timeout_seconds)

    async def request(
        self,
        method: str,
        path: str,
        payload: dict[str, object] | None = None,
    ) -> dict[str, object]:
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.request(
                    method,
                    f"{self.base_url}{path}",
                    json=payload,
                ) as response:
                    try:
                        body = await response.json(content_type=None)
                    except (aiohttp.ClientError, ValueError):
                        body = {}

                    if response.status >= 400:
                        message = body.get("message") if isinstance(body, dict) else None
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

    async def stream_brief(
        self,
        match_id: int,
        ai_config: dict[str, str],
        timeout_seconds: float,
    ) -> str:
        """请求比赛简报，并读取后端 SSE 流中的最终结果。"""
        try:
            timeout = aiohttp.ClientTimeout(total=timeout_seconds)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    f"{self.base_url}/ai/{match_id}/analyze?type=brief",
                    json=ai_config,
                ) as response:
                    if response.status >= 400:
                        raise BackendRequestError(
                            response.status,
                            f"Web 应用返回 HTTP {response.status}",
                        )

                    async for raw_line in response.content:
                        line = raw_line.decode("utf-8").strip()
                        if not line.startswith("data:"):
                            continue
                        try:
                            event = json.loads(line[5:].strip())
                        except json.JSONDecodeError:
                            continue

                        if event.get("type") == "error":
                            raise BackendRequestError(
                                int(event.get("status") or 502),
                                str(event.get("message") or "AI 简报生成失败"),
                            )
                        if event.get("type") == "done":
                            analysis = event.get("analysis")
                            text = analysis.get("text") if isinstance(analysis, dict) else None
                            if isinstance(text, str) and text.strip():
                                return text.strip()

                    raise BackendRequestError(502, "Web 应用未返回 AI 简报")
        except BackendRequestError:
            raise
        except (aiohttp.ClientError, TimeoutError) as exc:
            raise BackendRequestError(503, f"无法连接 Dota 2 助手 Web 应用：{exc}") from exc
