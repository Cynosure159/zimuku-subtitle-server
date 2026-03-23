import logging
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from ..core.archive import ArchiveManager
from ..core.config import ConfigManager
from ..core.scraper import ZimukuAgent
from ..db.models import SubtitleTask

logger = logging.getLogger(__name__)

SUBTITLE_EXTENSIONS = (".srt", ".ass", ".ssa", ".sub", ".sup")


class DownloadWorkflowError(Exception):
    """下载流程中可预期的失败。"""


@dataclass
class DownloadArtifact:
    filename: str
    file_path: str
    save_path: str
    extracted_files: List[str]


@dataclass
class SubtitlePlacement:
    source_path: str
    destination_path: str


class SubtitleFileSelector:
    @staticmethod
    def collect_candidates(base_path: str) -> List[str]:
        if os.path.isdir(base_path):
            subtitle_files = []
            for root, _, files in os.walk(base_path):
                for filename in files:
                    if filename.lower().endswith(SUBTITLE_EXTENSIONS):
                        subtitle_files.append(os.path.join(root, filename))
            return sorted(subtitle_files)

        if base_path.lower().endswith(SUBTITLE_EXTENSIONS):
            return [base_path]
        return []

    @classmethod
    def select_best(cls, base_path: str) -> str:
        subtitle_candidates = cls.collect_candidates(base_path)
        if not subtitle_candidates:
            raise DownloadWorkflowError("下载结果中未找到可用字幕文件")
        return subtitle_candidates[0]


class SubtitleMover:
    VIDEO_EXTENSIONS = (".mp4", ".mkv", ".avi", ".wmv", ".mov")

    @staticmethod
    def resolve_target_directory(task: SubtitleTask) -> Optional[str]:
        if not task.target_path:
            return None
        if task.target_type == "movie":
            return os.path.dirname(task.target_path)
        return task.target_path

    @classmethod
    def find_video_basename(cls, task: SubtitleTask, target_dir: str) -> Optional[str]:
        if task.target_type == "movie":
            return os.path.splitext(os.path.basename(task.target_path))[0] if task.target_path else None

        if task.target_type == "tv" and task.season and task.episode and os.path.isdir(target_dir):
            season_str = f"s{task.season:02d}"
            episode_str = f"e{task.episode:02d}"
            for filename in os.listdir(target_dir):
                lower_name = filename.lower()
                if lower_name.endswith(cls.VIDEO_EXTENSIONS) and season_str in lower_name and episode_str in lower_name:
                    return os.path.splitext(filename)[0]
        return None

    @staticmethod
    def build_destination_path(task: SubtitleTask, video_basename: str, source_path: str, target_dir: str) -> str:
        ext = Path(source_path).suffix
        lang_tag = task.language or "未知"
        return os.path.join(target_dir, f"{video_basename}.{lang_tag}{ext}")

    @classmethod
    def plan_move(cls, task: SubtitleTask, save_path: str) -> SubtitlePlacement:
        target_dir = cls.resolve_target_directory(task)
        if not target_dir:
            raise DownloadWorkflowError("未配置目标目录")

        video_basename = cls.find_video_basename(task, target_dir)
        if not video_basename:
            raise DownloadWorkflowError(f"无法从 target_path 提取视频文件名: {task.target_path}")

        source_path = SubtitleFileSelector.select_best(save_path)
        destination_path = cls.build_destination_path(task, video_basename, source_path, target_dir)
        return SubtitlePlacement(source_path=source_path, destination_path=destination_path)

    @classmethod
    def move(cls, task: SubtitleTask, save_path: str) -> str:
        placement = cls.plan_move(task, save_path)
        shutil.move(placement.source_path, placement.destination_path)
        logger.info("task %s: subtitle moved to %s", task.id, placement.destination_path)
        return placement.destination_path


class DownloadWorkflow:
    def __init__(self, agent: Optional[ZimukuAgent] = None):
        self.agent = agent or ZimukuAgent()

    async def execute(self, task: SubtitleTask) -> DownloadArtifact:
        logger.info("task %s: resolving download links", task.id)
        download_links = await self.agent.get_download_page_links(task.source_url)
        if not download_links:
            raise DownloadWorkflowError("未能提取下载链接")

        logger.info("task %s: downloading remote file", task.id)
        filename, content = await self.agent.download_file(download_links, task.source_url)
        if not filename or not content:
            raise DownloadWorkflowError("下载失败，内容为空")

        file_path = self.persist_download(filename, content)
        save_path, extracted_files = self.prepare_local_artifact(file_path, filename)
        return DownloadArtifact(
            filename=filename,
            file_path=file_path,
            save_path=save_path,
            extracted_files=extracted_files,
        )

    @staticmethod
    def get_storage_path() -> str:
        storage_path = ConfigManager.get("storage_path", "storage/downloads")
        os.makedirs(storage_path, exist_ok=True)
        return storage_path

    @classmethod
    def persist_download(cls, filename: str, content: bytes) -> str:
        storage_path = cls.get_storage_path()
        file_path = os.path.join(storage_path, filename)
        with open(file_path, "wb") as file_obj:
            file_obj.write(content)
        logger.info("download saved to %s", file_path)
        return file_path

    @staticmethod
    def prepare_local_artifact(file_path: str, filename: str) -> tuple[str, List[str]]:
        if ArchiveManager.is_archive(filename):
            extract_to = os.path.join(os.path.dirname(file_path), os.path.splitext(filename)[0])
            extracted_files = ArchiveManager.extract(file_path, extract_to)
            logger.info("archive extracted to %s (%s files)", extract_to, len(extracted_files))
            return extract_to, extracted_files

        return file_path, [file_path]

    async def close(self):
        await self.agent.close()
