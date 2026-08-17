import json
from datetime import datetime
from pathlib import Path


def load_hero_names() -> dict[str, str]:
    try:
        with Path(__file__).with_name("hero_names_zh.json").open(encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def format_recent_matches(
    player_name: str,
    steam_id: str,
    items: object,
    hero_names: dict[str, str],
) -> str:
    if not isinstance(items, list) or not items:
        return f"{player_name or '当前账号'} 暂无比赛记录。"

    lines = [
        f"{player_name or '当前账号'} 最近 {min(5, len(items))} 场比赛",
        f"Steam64 ID：{steam_id}",
    ]
    status_names = {
        "PENDING": "待解析",
        "PROCESSING": "解析中",
        "COMPLETED": "已完成",
        "FAILED": "解析失败",
    }
    for index, item in enumerate(items[:5], start=1):
        if not isinstance(item, dict):
            continue

        start_time = item.get("startTime")
        if isinstance(start_time, (int, float)):
            date_text = datetime.fromtimestamp(start_time).strftime("%m-%d %H:%M")
        else:
            date_text = "时间未知"

        duration = item.get("duration")
        if isinstance(duration, (int, float)) and duration >= 0:
            duration_text = f"{int(duration) // 60}:{int(duration) % 60:02d}"
        else:
            duration_text = "时长未知"

        victory = item.get("isVictory")
        result = "胜" if victory is True else "负" if victory is False else "未知"
        kills = item.get("kills", "-")
        deaths = item.get("deaths", "-")
        assists = item.get("assists", "-")
        match_id = item.get("matchId", "未知")
        hero_id = item.get("heroId", "未知")
        hero_name = hero_names.get(str(hero_id), f"ID {hero_id}")
        status = status_names.get(str(item.get("status")), "未知状态")
        lines.append(
            f"{index}. [{result}] {date_text} | 比赛 {match_id} | "
            f"K/D/A {kills}/{deaths}/{assists} | 时长 {duration_text} | "
            f"英雄 {hero_name} | {status}"
        )
    return "\n".join(lines)
