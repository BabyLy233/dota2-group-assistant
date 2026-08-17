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
