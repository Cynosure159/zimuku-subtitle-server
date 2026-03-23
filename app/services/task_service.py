import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from sqlmodel import Session, desc, func, select

from ..core.archive import ArchiveManager
from ..core.config import ConfigManager
from ..core.scraper import ZimukuAgent
from ..db.models import SubtitleTask

logger = logging.getLogger(__name__)
SUBTITLE_EXTENSIONS = (".srt", ".ass", ".ssa", ".sub", ".sup")


class TaskService:
    @staticmethod
    def _resolve_target_directory(task: SubtitleTask) -> Optional[str]:
        if not task.target_path:
            return None
        if task.target_type == "movie":
            return os.path.dirname(task.target_path)
        return task.target_path

    @staticmethod
    def _find_video_basename(task: SubtitleTask, target_dir: str) -> Optional[str]:
        if task.target_type == "movie":
            return os.path.splitext(os.path.basename(task.target_path))[0] if task.target_path else None

        if task.target_type == "tv" and task.season and task.episode and os.path.isdir(target_dir):
            season_str = f"s{task.season:02d}"
            episode_str = f"e{task.episode:02d}"
            for filename in os.listdir(target_dir):
                lower_name = filename.lower()
                if (
                    lower_name.endswith((".mp4", ".mkv", ".avi", ".wmv", ".mov"))
                    and season_str in lower_name
                    and episode_str in lower_name
                ):
                    return os.path.splitext(filename)[0]
        return None

    @staticmethod
    def _collect_subtitle_candidates(base_path: str) -> List[str]:
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

    @staticmethod
    def _move_subtitle_to_target(task: SubtitleTask) -> str:
        if not task.save_path:
            raise ValueError("未找到可移动的字幕文件")

        target_dir = TaskService._resolve_target_directory(task)
        if not target_dir:
            raise ValueError("未配置目标目录")

        video_filename = TaskService._find_video_basename(task, target_dir)
        if not video_filename:
            raise FileNotFoundError(f"无法从 target_path 提取视频文件名: {task.target_path}")

        subtitle_candidates = TaskService._collect_subtitle_candidates(task.save_path)
        if not subtitle_candidates:
            raise FileNotFoundError("下载结果中未找到可用字幕文件")

        src_file = subtitle_candidates[0]
        ext = Path(src_file).suffix
        lang_tag = task.language or "未知"
        target_full_path = os.path.join(target_dir, f"{video_filename}.{lang_tag}{ext}")
        shutil.move(src_file, target_full_path)
        logger.info(f"文件已移动到: {target_full_path}")
        return target_full_path

    @staticmethod
    def create_task(
        session: Session,
        title: str,
        source_url: str,
        target_path: Optional[str] = None,
        target_type: Optional[str] = None,
        season: Optional[int] = None,
        episode: Optional[int] = None,
        language: Optional[str] = None,
    ) -> SubtitleTask:
        task = SubtitleTask(
            title=title,
            source_url=source_url,
            status="pending",
            target_path=target_path,
            target_type=target_type,
            season=season,
            episode=episode,
            language=language,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        return task

    @staticmethod
    def get_task(session: Session, task_id: int) -> Optional[SubtitleTask]:
        return session.get(SubtitleTask, task_id)

    @staticmethod
    def list_tasks(
        session: Session, offset: int = 0, limit: int = 10, status: Optional[str] = None
    ) -> Tuple[List[SubtitleTask], int]:
        statement = select(SubtitleTask).order_by(desc(SubtitleTask.created_at))
        if status:
            statement = statement.where(SubtitleTask.status == status)

        count_statement = select(func.count()).select_from(SubtitleTask)
        if status:
            count_statement = count_statement.where(SubtitleTask.status == status)
        total = session.exec(count_statement).one()

        items = session.exec(statement.offset(offset).limit(limit)).all()
        return items, total

    @staticmethod
    def delete_task(session: Session, task_id: int, delete_files: bool = False) -> bool:
        task = session.get(SubtitleTask, task_id)
        if not task:
            return False

        if delete_files and task.save_path and os.path.exists(task.save_path):
            try:
                if os.path.isdir(task.save_path):
                    shutil.rmtree(task.save_path)
                else:
                    os.remove(task.save_path)
            except Exception as e:
                logger.error(f"删除任务关联文件失败: {e}")

        session.delete(task)
        session.commit()
        return True

    @staticmethod
    def retry_task(session: Session, task_id: int) -> Optional[SubtitleTask]:
        task = session.get(SubtitleTask, task_id)
        if not task or task.status != "failed":
            return None

        task.status = "pending"
        task.error_msg = None
        task.updated_at = datetime.now()
        session.add(task)
        session.commit()
        session.refresh(task)
        return task

    @staticmethod
    def clear_completed(session: Session) -> int:
        statement = select(SubtitleTask).where(SubtitleTask.status == "completed")
        tasks = session.exec(statement).all()
        count = len(tasks)
        for task in tasks:
            session.delete(task)
        session.commit()
        return count

    @staticmethod
    async def run_download_task(task_id: int):
        from ..db.session import engine

        with Session(engine) as session:
            task = session.get(SubtitleTask, task_id)
            if not task:
                return

            agent = ZimukuAgent()
            try:
                final_status = "completed"
                task.status = "downloading"
                task.updated_at = datetime.now()
                session.add(task)
                session.commit()

                dld_links = await agent.get_download_page_links(task.source_url)
                if not dld_links:
                    raise Exception("未能提取下载链接")

                filename, content = await agent.download_file(dld_links, task.source_url)
                if not content:
                    raise Exception("下载失败，内容为空")

                storage_path = ConfigManager.get("storage_path", "storage/downloads")
                os.makedirs(storage_path, exist_ok=True)
                file_path = os.path.join(storage_path, filename)
                with open(file_path, "wb") as f:
                    f.write(content)

                if ArchiveManager.is_archive(filename):
                    extract_to = os.path.join(storage_path, os.path.splitext(filename)[0])
                    ArchiveManager.extract(file_path, extract_to)
                    task.save_path = extract_to
                else:
                    task.save_path = file_path

                # Move file to target directory if target_path is specified
                if task.target_path and task.save_path:
                    try:
                        task.save_path = TaskService._move_subtitle_to_target(task)
                    except Exception as e:
                        logger.error(f"移动文件失败: {e}")
                        task.error_msg = f"下载成功但移动失败: {e}"
                        final_status = "failed"

                task.status = final_status
                task.filename = filename
            except Exception as e:
                logger.error(f"任务 {task_id} 失败: {e}")
                task.status = "failed"
                task.error_msg = str(e)
            finally:
                task.updated_at = datetime.now()
                session.add(task)
                session.commit()
                await agent.close()
