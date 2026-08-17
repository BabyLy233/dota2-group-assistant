STEAM64_OFFSET = 76561197960265728
MAX_ACCOUNT_ID = 0xFFFFFFFF


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

    return str(STEAM64_OFFSET + account_id), account_id
