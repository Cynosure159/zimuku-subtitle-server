import logging
import os
import shutil
from datetime import datetime
from typing import List, Optional, Tuple

from sqlmodel import Session, desc, func, select

from ..core.archive import ArchiveManager
from ..core.config import ConfigManager
from ..core.scraper import ZimukuAgent
from ..db.models import SubtitleTask

logger = logging.getLogger(__name__)


class TaskService:
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
                    try:
                        ArchiveManager.extract(file_path, extract_to)
                        task.save_path = extract_to
                    except Exception as e:
                        logger.error(f"解压失败: {e}")
                        task.error_msg = f"Download OK, extraction failed: {e}"
                else:
                    task.save_path = file_path

                # Move file to target directory if target_path is specified
                if task.target_path and task.save_path:
                    try:
                        # Find video file in target directory
                        video_filename = None
                        if task.target_type == "tv" and task.season and task.episode:
                            # For TV series, search for SxxExx pattern
                            season_str = f"S{task.season:02d}"
                            episode_str = f"E{task.episode:02d}"
                            for f in os.listdir(task.target_path):
                                if f.lower().endswith((".mp4", ".mkv", ".avi", ".wmv", ".mov")):
                                    if season_str in f and episode_str in f:
                                        video_filename = os.path.splitext(f)[0]
                                        break
                        elif task.target_type == "movie":
                            # target_path is the full video file path, extract directory and filename
                            target_dir = os.path.dirname(task.target_path)
                            video_filename = os.path.splitext(os.path.basename(task.target_path))[0]

                        if video_filename:
                            # Get extension from downloaded file
                            if os.path.isdir(task.save_path):
                                # For extracted archives, find the subtitle file
                                subtitle_files = []
                                for root, _, files in os.walk(task.save_path):
                                    for f in files:
                                        if f.lower().endswith((".srt", ".ass", ".ssa", ".sub", ".sup")):
                                            subtitle_files.append(os.path.join(root, f))
                                if subtitle_files:
                                    src_file = subtitle_files[0]
                                    ext = os.path.splitext(src_file)[1]
                            else:
                                src_file = task.save_path
                                ext = os.path.splitext(task.save_path)[1]

                            # Format new filename with language tag
                            lang_tag = task.language or "未知"
                            new_filename = f"{video_filename}.{lang_tag}{ext}"
                            target_full_path = os.path.join(target_dir, new_filename)

                            # Move file
                            shutil.move(src_file, target_full_path)
                            task.save_path = target_full_path
                            logger.info(f"文件已移动到: {target_full_path}")
                        else:
                            logger.warning(f"无法从 target_path 提取视频文件名: {task.target_path}")
                    except Exception as e:
                        logger.error(f"移动文件失败: {e}")
                        # Keep file in original download directory as backup
                        task.error_msg = f"下载成功但移动失败: {e}"

                task.status = "completed"
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
