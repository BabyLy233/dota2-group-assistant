import asyncio
import time


class CommandGate:
    """限制同一用户的并发指令和短时间重复指令。"""

    def __init__(self, cooldown_seconds: float):
        self.cooldown = cooldown_seconds
        self._locks: dict[str, asyncio.Lock] = {}
        self._last_command_at: dict[tuple[str, str], float] = {}

    async def begin(
        self,
        user_id: str,
        command: str,
    ) -> tuple[asyncio.Lock | None, str | None]:
        lock = self._locks.setdefault(user_id, asyncio.Lock())
        if lock.locked():
            return None, "你上一个请求还在处理中，请稍后再试。"

        remaining = self.cooldown - (
            time.monotonic() - self._last_command_at.get((user_id, command), 0)
        )
        if remaining > 0:
            return None, f"该指令请求过于频繁，请 {max(1, int(remaining) + 1)} 秒后再试。"

        await lock.acquire()
        self._last_command_at[(user_id, command)] = time.monotonic()
        return lock, None

    def finish(self, lock: asyncio.Lock | None) -> None:
        if lock is not None and lock.locked():
            lock.release()

    def clear(self, user_id: str, command: str) -> None:
        self._last_command_at.pop((user_id, command), None)
