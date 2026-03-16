import asyncio
import logging
import os
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Set, Tuple

from sqlmodel import Session, select

from ..core.archive import ArchiveManager
from ..core.config import get_storage_path
from ..core.scraper import ZimukuAgent
from ..core.utils import check_has_subtitle, parse_media_filename
from ..db.models import MediaPath, ScannedFile

logger = logging.getLogger(__name__)


class MediaTaskStatus:
    def __init__(self):
        self.is_scanning = False
        self.matching_files: Set[int] = set()
        self.matching_seasons: Set[Tuple[str, int]] = set()

    def to_dict(self):
        return {
            "is_scanning": self.is_scanning,
            "matching_files": list(self.matching_files),
            "matching_seasons": [{"title": t, "season": s} for t, s in self.matching_seasons],
        }


global_task_status = MediaTaskStatus()


class MediaService:
    @staticmethod
    def list_paths(session: Session) -> List[MediaPath]:
        return session.exec(select(MediaPath)).all()

    @staticmethod
    def add_path(session: Session, path: str, path_type: str) -> MediaPath:
        existing = session.exec(select(MediaPath).where(MediaPath.path == path)).first()
        if existing:
            raise ValueError("Path already exists")

        new_path = MediaPath(path=path, type=path_type)
        session.add(new_path)
        session.commit()
        session.refresh(new_path)
        return new_path

    @staticmethod
    def delete_path(session: Session, path_id: int) -> bool:
        path = session.get(MediaPath, path_id)
        if not path:
            return False

        # 删除相关扫描记录
        statement = select(ScannedFile).where(ScannedFile.path_id == path_id)
        file_records = session.exec(statement).all()
        for file_record in file_records:
            session.delete(file_record)
        session.commit()

        # 删除路径
        db_path = session.get(MediaPath, path_id)
        if db_path:
            session.delete(db_path)
            session.commit()
            return True
        return False

    @staticmethod
    def update_path(
        session: Session, path_id: int, enabled: Optional[bool] = None, path_type: Optional[str] = None
    ) -> Optional[MediaPath]:
        db_path = session.get(MediaPath, path_id)
        if not db_path:
            return None

        if enabled is not None:
            db_path.enabled = enabled
        if path_type is not None:
            db_path.type = path_type

        session.add(db_path)
        session.commit()
        session.refresh(db_path)
        return db_path

    @staticmethod
    def list_files(session: Session, path_type: Optional[str] = None) -> List[ScannedFile]:
        statement = select(ScannedFile)
        if path_type:
            statement = statement.where(ScannedFile.type == path_type)
        statement = statement.order_by(ScannedFile.created_at.desc())
        return session.exec(statement).all()

    @staticmethod
    async def run_media_scan_and_match(session_data: Session, path_type: Optional[str] = None):
        """执行后台媒体扫描与匹配逻辑"""
        global_task_status.is_scanning = True
        try:
            # 1. 第一步清理：清理孤儿记录
            all_path_ids = [p.id for p in session_data.exec(select(MediaPath)).all()]
            orphan_files = session_data.exec(select(ScannedFile).where(ScannedFile.path_id.not_in(all_path_ids))).all()
            if orphan_files:
                logger.info(f"清理了 {len(orphan_files)} 条孤儿文件记录")
                for of in orphan_files:
                    session_data.delete(of)
                session_data.commit()

            # 2. 第二步清理：物理不存在记录
            statement = select(ScannedFile)
            if path_type:
                statement = statement.where(ScannedFile.type == path_type)
            all_files = session_data.exec(statement).all()
            removed_count = 0
            for f in all_files:
                if not os.path.exists(f.file_path):
                    session_data.delete(f)
                    removed_count += 1
            if removed_count > 0:
                logger.info(f"清理了 {removed_count} 条物理已不存在的记录")
                session_data.commit()

            # 3. 获取路径并扫描
            statement = select(MediaPath).where(MediaPath.enabled)
            if path_type:
                statement = statement.where(MediaPath.type == path_type)
            paths = session_data.exec(statement).all()

            video_extensions = {".mp4", ".mkv", ".avi", ".ts", ".rmvb"}
            for mp in paths:
                logger.info(f"扫描路径: {mp.path}")
                logger.debug(f"开始扫描路径: {mp.path}")
                scan_dir = Path(mp.path)
                if not scan_dir.exists() or not scan_dir.is_dir():
                    logger.debug(f"路径不存在或不是目录: {mp.path}")
                    continue

                try:
                    # 扫描逻辑：对于 TV 类型，一级文件夹就是一个剧集
                    # 对于 Movie 类型，一级文件夹就是一个电影

                    def process_single_file(file_path: Path, title: str, media_path: MediaPath):
                        """处理单个视频文件"""
                        str_path = str(file_path.absolute())
                        filename = file_path.name
                        logger.debug(f"处理文件: {filename}, title={title}")
                        parsed = parse_media_filename(filename)
                        logger.debug(f"解析结果: {parsed}")
                        has_sub = check_has_subtitle(file_path)
                        logger.debug(f"字幕检测结果: has_sub={has_sub}")

                        logger.debug(f"文件存在检查: {str_path} -> {os.path.exists(str_path)}")

                        existing_file = session_data.exec(
                            select(ScannedFile).where(ScannedFile.file_path == str_path)
                        ).first()

                        if not existing_file:
                            logger.debug(f"新增文件记录: {filename}")
                        else:
                            logger.debug(f"更新文件记录: {filename}")

                        if not existing_file:
                            new_file = ScannedFile(
                                path_id=media_path.id,
                                type=media_path.type,
                                file_path=str_path,
                                filename=filename,
                                extracted_title=title,
                                year=parsed["year"],
                                season=parsed["season"],
                                episode=parsed["episode"],
                                has_subtitle=has_sub,
                            )
                            session_data.add(new_file)
                        else:
                            existing_file.filename = filename
                            existing_file.extracted_title = title
                            existing_file.year = parsed["year"]
                            existing_file.season = parsed["season"]
                            existing_file.episode = parsed["episode"]
                            existing_file.has_subtitle = has_sub
                            session_data.add(existing_file)

                    for sub_dir in scan_dir.iterdir():
                        logger.debug(f"处理子目录: {sub_dir}")
                        if sub_dir.is_dir():
                            extracted_title = sub_dir.name
                            # TV 类型：一级文件夹 = 剧集名称，扫描该文件夹下所有层级的视频
                            # Movie 类型：保持原有逻辑
                            if mp.type == "tv":
                                # 扫描一级文件夹下的所有视频文件（可能直接存放，也可能放在 S01/ 等子目录中）
                                for file_path in sub_dir.rglob("*"):
                                    if file_path.is_file() and file_path.suffix.lower() in video_extensions:
                                        process_single_file(file_path, extracted_title, mp)
                            else:
                                # Movie: 直接在一级文件夹中查找视频
                                for file_path in sub_dir.iterdir():
                                    if file_path.is_file() and file_path.suffix.lower() in video_extensions:
                                        process_single_file(file_path, extracted_title, mp)
                except Exception as e:
                    logger.error(f"扫描 {mp.path} 出错: {e}")

                mp.last_scanned_at = datetime.now()
                session_data.add(mp)
            session_data.commit()
        finally:
            global_task_status.is_scanning = False

    @staticmethod
    async def run_auto_match_process(file_id: int):
        from ..db.session import engine

        with Session(engine) as session:
            await MediaService._run_auto_match_internal(file_id, session)

    @staticmethod
    async def _run_auto_match_internal(file_id: int, session: Session):
        global_task_status.matching_files.add(file_id)
        try:
            file_record = session.get(ScannedFile, file_id)
            if not file_record:
                return

            query = re.sub(r"\s*\(\d{4}\)", "", file_record.extracted_title).strip()
            season = file_record.season if file_record.type == "tv" else None
            episode = file_record.episode if file_record.type == "tv" else None

            logger.info(f"开始自动匹配: {file_record.filename}")
            agent = ZimukuAgent()
            try:
                results = await agent.search(query, season=season, episode=episode)
                if not results:
                    return

                max_tries = min(5, len(results))
                match_success = False

                for i in range(max_tries):
                    best_match = results[i]
                    dld_links = await agent.get_download_page_links(best_match.link)
                    if not dld_links:
                        continue

                    filename, content = await agent.download_file(dld_links, best_match.link)
                    if not content:
                        continue

                    tmp_dir = Path(get_storage_path()) / "tmp" / f"auto_{file_id}_{i}"
                    tmp_dir.mkdir(parents=True, exist_ok=True)
                    archive_path = tmp_dir / filename
                    with open(archive_path, "wb") as f:
                        f.write(content)

                    am = ArchiveManager()
                    extracted_files = []
                    subtitle_extensions = [".srt", ".ass", ".ssa", ".vtt", ".sub"]

                    if archive_path.suffix.lower() in [".zip", ".7z", ".rar"]:
                        extract_to = tmp_dir / "extracted"
                        extract_to.mkdir(exist_ok=True)
                        if am.extract(str(archive_path), str(extract_to)):
                            for root, _, files in os.walk(extract_to):
                                for f in files:
                                    if Path(f).suffix.lower() in subtitle_extensions:
                                        extracted_files.append(Path(root) / f)
                    else:
                        if archive_path.suffix.lower() in subtitle_extensions:
                            extracted_files.append(archive_path)

                    if not extracted_files:
                        shutil.rmtree(tmp_dir, ignore_errors=True)
                        continue

                    def get_sub_score(p: Path) -> int:
                        score = 0
                        name_upper = p.name.upper()
                        if season is not None and episode is not None:
                            se_pattern = f"S{season:02d}E{episode:02d}"
                            if se_pattern in name_upper:
                                score += 500
                            else:
                                other_seasons = re.findall(r"S(\d+)", name_upper)
                                if other_seasons and all(int(s) != season for s in other_seasons):
                                    score -= 1000
                                if f"E{episode:02d}" in name_upper:
                                    score += 50
                        elif episode is not None:
                            if f"E{episode:02d}" in name_upper:
                                score += 500

                        if p.suffix.lower() in [".ass", ".srt"]:
                            score += 50
                        name_lower = p.name.lower()
                        if any(k in name_lower for k in ["简体", "chs", "sc", "gb"]):
                            score += 100
                        if any(k in name_lower for k in ["双语", "bilingual", "eng&chs", "chs&eng"]):
                            score += 80
                        if any(k in name_lower for k in ["繁体", "cht", "tc", "big5"]) and "简" not in name_lower:
                            score -= 30
                        return score

                    extracted_files.sort(key=get_sub_score, reverse=True)
                    target_sub = extracted_files[0]
                    video_path = Path(file_record.file_path)
                    final_sub_path = video_path.parent / (video_path.stem + target_sub.suffix)

                    shutil.move(str(target_sub), str(final_sub_path))
                    file_record.has_subtitle = True
                    session.add(file_record)
                    session.commit()
                    logger.info(f"成功为 {file_record.filename} 匹配字幕")

                    shutil.rmtree(tmp_dir, ignore_errors=True)
                    match_success = True
                    break

                if not match_success:
                    logger.error("匹配不到合适字幕")

            finally:
                global_task_status.matching_files.discard(file_id)
                await agent.close()
        except Exception as e:
            logger.error(f"自动匹配异常: {e}", exc_info=True)
        finally:
            global_task_status.matching_files.discard(file_id)

    @staticmethod
    async def run_season_match_process(title: str, season: int):
        from sqlmodel import or_

        from ..db.session import engine

        # 去除年份，与单文件自动匹配保持一致
        query_title = re.sub(r"\s*\(\d{4}\)", "", title).strip()
        logger.debug(f"开始季匹配: title={title}, query_title={query_title}, season={season}")
        global_task_status.matching_seasons.add((title, season))
        try:
            with Session(engine) as session:
                # 同时匹配带年份和不带年份的标题（数据库中可能存的是带年份的）
                logger.debug(f"查询条件: title={query_title}/{title}, season={season}, type=tv, has_subtitle=false")
                statement = select(ScannedFile).where(
                    or_(
                        ScannedFile.extracted_title == query_title,
                        ScannedFile.extracted_title == title,
                    ),
                    ScannedFile.type == "tv",
                    ScannedFile.season == season,
                    not ScannedFile.has_subtitle,
                )
                files = session.exec(statement).all()
                logger.debug(f"查询到 {len(files)} 个无字幕文件")
                if not files:
                    logger.debug(f"未找到匹配的文件: query_title={query_title}, season={season}")
                    return

                for f in files:
                    logger.debug(f"处理文件: {f.filename}")
                    # 复用内部匹配流程
                    await MediaService._run_auto_match_internal(f.id, session)
                    await asyncio.sleep(2)
                logger.debug(f"季匹配完成: query_title={query_title}, season={season}")
        except Exception as e:
            logger.debug(f"季匹配异常: query_title={query_title}, season={season}, error={e}")
            raise
        finally:
            global_task_status.matching_seasons.discard((title, season))
