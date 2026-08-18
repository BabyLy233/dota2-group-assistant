from datetime import datetime


def _text(value: object, fallback: str = "-") -> str:
    if value is None or value == "":
        return fallback
    return str(value).replace("|", "\\|").replace("\n", " ")


def _time(value: object) -> str:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value).strftime("%Y-%m-%d %H:%M")
    return "未知"


def _duration(value: object) -> str:
    if not isinstance(value, (int, float)) or value < 0:
        return "未知"
    return f"{int(value) // 60}:{int(value) % 60:02d}"


def _result(value: object) -> str:
    if value is True:
        return "胜"
    if value is False:
        return "负"
    return "未知"


def format_match_detail(
    detail: dict[str, object],
    hero_names: dict[str, str],
) -> str:
    match_id = detail.get("matchId", "未知")
    winning_team = detail.get("winningTeam")
    winner = "天辉" if winning_team == 0 else "夜魇" if winning_team == 1 else "未知"
    score = f"天辉 {_text(detail.get('radiantScore'))} - {_text(detail.get('direScore'))} 夜魇"

    lines = [
        f"## Dota 2 比赛 {match_id}",
        "",
        "| 比赛信息 | 内容 |",
        "| --- | --- |",
        f"| 时间 | {_time(detail.get('startTime'))} |",
        f"| 时长 | {_duration(detail.get('duration'))} |",
        f"| 比分 | {score} |",
        f"| 胜方 | {winner} |",
        f"| 状态 | {_text(detail.get('status'))} |",
        f"| 已解析 | {'是' if detail.get('parsed') else '否'} |",
        "",
        "| 阵营 | 玩家 | 英雄 | K/D/A | GPM | XPM | 净收入 | 伤害 | IMP | 结果 |",
        "| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ]

    players = detail.get("players")
    if not isinstance(players, list) or not players:
        lines.append("| - | 暂无玩家数据 | - | - | - | - | - | - | - | - |")
        return "\n".join(lines)

    for player in players:
        if not isinstance(player, dict):
            continue
        hero_id = player.get("heroId")
        hero_name = hero_names.get(str(hero_id), f"ID {hero_id}")
        player_slot = player.get("playerSlot")
        team = "天辉" if isinstance(player_slot, int) and player_slot < 128 else "夜魇"
        kda = "/".join(
            _text(player.get(key)) for key in ("kills", "deaths", "assists")
        )
        lines.append(
            f"| {team} | {_text(player.get('name'))} | {hero_name} | {kda} | "
            f"{_text(player.get('gpm'))} | {_text(player.get('xpm'))} | "
            f"{_text(player.get('netWorth'))} | {_text(player.get('heroDamage'))} | "
            f"{_text(player.get('imp'))} | {_result(player.get('isVictory'))} |"
        )
    return "\n".join(lines)
