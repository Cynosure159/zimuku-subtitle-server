import os
import re
from pathlib import Path
from typing import Any, Dict


def parse_media_filename(filename: str) -> Dict[str, Any]:
    """解析文件名：提取标题、年份、季、集"""
    name = os.path.splitext(filename)[0]
    result: Dict[str, Any] = {"extracted_title": name, "year": None, "season": None, "episode": None}

    # 提取季和集 (e.g. S01E02, s1e2, S1.E2)
    se_match = re.search(r"(?i)s(\d+)[._\s-]*e(\d+)", name)
    if se_match:
        result["season"] = int(se_match.group(1))
        result["episode"] = int(se_match.group(2))
        name = name[: se_match.start()].strip()

    # 查找年份 19xx 或 20xx
    match = re.search(r"\b(19\d{2}|20\d{2})\b", name)
    if match:
        result["year"] = match.group(1)
        name = name[: match.start()].strip()

    # 将 ._ 替换为空格并清理常见词
    name = re.sub(r"[\._]", " ", name)
    name = re.sub(r"(?i)(1080p|720p|2160p|4k|bluray|web-dl|x264|x265|hevc|aac).*$", "", name).strip()
    result["extracted_title"] = name
    return result


def check_has_subtitle(file_path: Path) -> bool:
    """检查是否存在同名字幕文件（支持语言后缀）"""
    # 使用解析后的标题进行匹配，更准确
    extracted = parse_media_filename(file_path.name)
    video_title = extracted.get("extracted_title", "").lower()
    video_episode = extracted.get("episode")

    if not video_title:
        video_title = file_path.stem.lower()

    dir_path = file_path.parent
    subtitle_exts = {".srt", ".ass", ".ssa", ".vtt", ".sub"}

    try:
        if not dir_path.exists():
            return False
        for f in dir_path.iterdir():
            if f.is_file() and f.suffix.lower() in subtitle_exts:
                # 解析字幕文件名
                sub_extracted = parse_media_filename(f.name)
                sub_title = sub_extracted.get("extracted_title", "").lower()
                sub_episode = sub_extracted.get("episode")

                # 必须同时匹配标题和集数
                if video_episode is not None and sub_episode is not None:
                    # 两者都有集数，必须匹配
                    if sub_title == video_title and sub_episode == video_episode:
                        return True
                elif sub_title == video_title:
                    # 没有集数（如电影），只匹配标题
                    return True
    except Exception:
        pass
    return False
