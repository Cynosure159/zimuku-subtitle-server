import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..db.models import MediaPath, ScannedFile
from ..db.session import get_session

router = APIRouter(prefix="/media", tags=["Media"])
logger = logging.getLogger(__name__)


def parse_media_filename(filename: str) -> dict:
    """解析文件名：提取标题、年份、季、集"""
    name = os.path.splitext(filename)[0]
    result = {"extracted_title": name, "year": None, "season": None, "episode": None}

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

    # 将 ._ 替换为空格
    name = re.sub(r"[\._]", " ", name)

    # 移除常见的干扰词
    name = re.sub(r"(?i)(1080p|720p|2160p|4k|bluray|web-dl|x264|x265|hevc|aac).*$", "", name).strip()
    result["extracted_title"] = name
    return result


def check_has_subtitle(file_path: Path) -> bool:
    """检查是否存在同名字幕文件"""
    base_name = file_path.stem
    dir_path = file_path.parent
    subtitle_exts = {".srt", ".ass", ".ssa", ".vtt", ".sub"}

    try:
        for f in dir_path.iterdir():
            if f.is_file() and f.suffix.lower() in subtitle_exts:
                if f.stem.startswith(base_name):
                    return True
    except Exception:
        pass
    return False


@router.get("/paths", response_model=List[MediaPath])
async def list_media_paths(session: Session = Depends(get_session)):
    """获取所有媒体库扫描路径"""
    statement = select(MediaPath)
    results = session.exec(statement).all()
    return results


@router.post("/paths", response_model=MediaPath)
async def add_media_path(
    path: str,
    path_type: str = Query(default="movie", pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
):
    """添加媒体库扫描路径"""
    # 检查是否已存在
    existing = session.exec(select(MediaPath).where(MediaPath.path == path)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Path already exists")

    new_path = MediaPath(path=path, type=path_type)
    session.add(new_path)
    session.commit()
    session.refresh(new_path)
    return new_path


@router.delete("/paths/{path_id}")
async def delete_media_path(path_id: int, session: Session = Depends(get_session)):
    """删除媒体库扫描路径"""
    path = session.get(MediaPath, path_id)
    if not path:
        raise HTTPException(status_code=404, detail="Path not found")

    # 删除相关的扫描文件记录
    for file_record in session.exec(select(ScannedFile).where(ScannedFile.path_id == path_id)).all():
        session.delete(file_record)

    session.delete(path)
    session.commit()
    return {"status": "ok", "message": f"Path {path_id} deleted"}


@router.patch("/paths/{path_id}", response_model=MediaPath)
async def update_media_path(
    path_id: int,
    enabled: Optional[bool] = None,
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"),
    session: Session = Depends(get_session),
):
    """更新媒体库扫描路径配置"""
    db_path = session.get(MediaPath, path_id)
    if not db_path:
        raise HTTPException(status_code=404, detail="Path not found")

    if enabled is not None:
        db_path.enabled = enabled
    if path_type is not None:
        db_path.type = path_type

    session.add(db_path)
    session.commit()
    session.refresh(db_path)
    return db_path


@router.get("/files", response_model=List[ScannedFile])
async def list_scanned_files(
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"), session: Session = Depends(get_session)
):
    """获取已扫描的媒体文件列表"""
    statement = select(ScannedFile)
    if path_type:
        statement = statement.where(ScannedFile.type == path_type)
    statement = statement.order_by(ScannedFile.created_at.desc())
    results = session.exec(statement).all()
    return results


async def run_auto_match_process(file_id: int, session_data: Session = None):
    """执行单个视频文件的全自动匹配与下载流程"""
    import shutil
    from sqlmodel import Session
    from ..db.session import engine
    from ..core.archive import ArchiveManager
    from ..core.scraper import ZimukuAgent
    from ..db.models import ScannedFile

    # 如果没有传入 session，则新建一个
    if session_data is None:
        with Session(engine) as session:
            file_record = session.get(ScannedFile, file_id)
            if not file_record:
                logger.error(f"找不到文件记录: {file_id}")
                return
            # 转调自身并传入 session
            return await run_auto_match_process_internal(file_id, session)
    else:
        return await run_auto_match_process_internal(file_id, session_data)


async def run_auto_match_process_internal(file_id: int, session_data: Session):
    """内部执行逻辑"""
    import shutil
    from ..core.archive import ArchiveManager
    from ..core.scraper import ZimukuAgent
    from ..db.models import ScannedFile

    file_record = session_data.get(ScannedFile, file_id)
    if not file_record:
        logger.error(f"找不到文件记录: {file_id}")
        return

    # 1. 构造搜索参数
    # 移除查询字符串中可能包含的年份标识（例如 " (2024)" 避免强限定导致搜不到后续的季）
    query = re.sub(r"\s*\(\d{4}\)", "", file_record.extracted_title).strip()
    season = file_record.season if file_record.type == "tv" else None
    episode = file_record.episode if file_record.type == "tv" else None

    logger.info(f"开始为 {file_record.filename} 执行全自动匹配，搜索词: {query}, 季: {season}, 集: {episode}")

    agent = ZimukuAgent()
    try:
        # 2. 搜索字幕（利用三层递进匹配策略精确定位指定集）
        results = await agent.search(query, season=season, episode=episode)
        if not results:
            logger.warning(f"搜索 '{query}' 未找到任何结果")
            return

        # 限制只尝试前 5 个搜索结果，避免无限循环
        max_tries = min(5, len(results))
        match_success = False

        for i in range(max_tries):
            best_match = results[i]
            logger.info(f"正在尝试第 {i + 1}/{max_tries} 个匹配项: {best_match.title}")

            # 4. 获取下载链接并下载
            dld_links = await agent.get_download_page_links(best_match.link)
            if not dld_links:
                continue

            # 多链接轮询下载
            filename, content = await agent.download_file(dld_links, best_match.link)
            if not content:
                continue

            # 5. 保存到临时目录
            from ..core.config import get_storage_path

            tmp_dir = Path(get_storage_path()) / "tmp" / f"auto_{file_id}_{i}"
            tmp_dir.mkdir(parents=True, exist_ok=True)

            archive_path = tmp_dir / filename
            with open(archive_path, "wb") as f:
                f.write(content)

            # 6. 使用 ArchiveManager 解压并筛选
            am = ArchiveManager()
            extracted_files = []
            # 严格限制字幕后缀，暂时剔除 .txt
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
                logger.warning(f"匹配项 {i + 1} 没找到有效字幕文件，尝试下一个...")
                shutil.rmtree(tmp_dir, ignore_errors=True)
                continue

            # 7. 智能挑选字幕文件
            # 权重打分逻辑
            def get_sub_score(p: Path) -> int:
                score = 0
                name_upper = p.name.upper()

                # 优先级 0: 季集精确匹配
                if season is not None and episode is not None:
                    se_pattern = f"S{season:02d}E{episode:02d}"
                    if se_pattern in name_upper:
                        score += 500
                    else:
                        # 检查是否有显式的错误季标识 (如我们要 S02，结果文件名含 S01)
                        other_seasons = re.findall(r"S(\d+)", name_upper)
                        if other_seasons and all(int(s) != season for s in other_seasons):
                            score -= 1000  # 严重降权

                        # 即使没有 Sxx，也检查下集号是否匹配
                        if f"E{episode:02d}" in name_upper:
                            score += 50
                elif episode is not None:
                    if f"E{episode:02d}" in name_upper:
                        score += 500

                # 优先级 1: 格式
                if p.suffix.lower() in [".ass", ".srt"]:
                    score += 50

                # 优先级 2: 语言关键词
                name_lower = p.name.lower()
                if any(k in name_lower for k in ["简体", "chs", "sc", "gb"]):
                    score += 100
                if any(k in name_lower for k in ["双语", "bilingual", "eng&chs", "chs&eng"]):
                    score += 80

                # 排除繁体干扰 (除非它也带了简体)
                if any(k in name_lower for k in ["繁体", "cht", "tc", "big5"]) and "简" not in name_lower:
                    score -= 30
                return score

            # 按分数排序，取最高分
            extracted_files.sort(key=get_sub_score, reverse=True)
            target_sub = extracted_files[0]

            logger.info(f"从包中选定最佳字幕文件: {target_sub.name} (得分: {get_sub_score(target_sub)})")

            # 8. 归档
            video_path = Path(file_record.file_path)
            final_sub_path = video_path.parent / (video_path.stem + target_sub.suffix)

            logger.info(f"正在将字幕归档至: {final_sub_path}")
            shutil.move(str(target_sub), str(final_sub_path))

            # 9. 更新数据库
            file_record.has_subtitle = True
            session_data.add(file_record)
            session_data.commit()
            logger.info(f"文件 {file_record.filename} 字幕全自动匹配成功！")

            # 清理并跳出循环
            shutil.rmtree(tmp_dir, ignore_errors=True)
            match_success = True
            break

        if not match_success:
            logger.error(f"尝试了前 {max_tries} 个结果，均未找到符合要求的字幕文件。")

    except Exception as e:
        logger.error(f"自动匹配流程发生异常: {str(e)}", exc_info=True)
    finally:
        await agent.close()


async def run_season_match_process(title: str, season: int):
    """执行剧集季全自动匹配流程"""
    from sqlmodel import Session
    from ..db.session import engine
    from ..db.models import ScannedFile

    with Session(engine) as session:
        statement = select(ScannedFile).where(
            ScannedFile.extracted_title == title,
            ScannedFile.type == "tv",
            ScannedFile.season == season,
            ScannedFile.has_subtitle == False,
        )
        files = session.exec(statement).all()

        if not files:
            logger.info(f"剧集 '{title}' 第 {season} 季不需要补全字幕")
            return

        logger.info(f"开始补全剧集 '{title}' 第 {season} 季字幕，共有 {len(files)} 个文件缺失")

        # 逐个调用单文件匹配逻辑
        for f in files:
            # 内部会自动开启并关闭 SessionLocal 做持久化
            await run_auto_match_process(f.id)
            # 稍微停顿一下，避免 Zimuku 频繁请求异常
            import asyncio

            await asyncio.sleep(2)


async def run_media_scan_and_match(session_data: Session, path_type: Optional[str] = None):
    """执行后台媒体扫描与匹配逻辑"""
    # 1. 清理失效的记录：如果物理文件已不存在，则删除数据库记录
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
        logger.info(f"清理了 {removed_count} 条已不存在的媒体文件记录")
        session_data.commit()

    # 2. 获取所有启用的路径
    statement = select(MediaPath).where(MediaPath.enabled)
    if path_type:
        statement = statement.where(MediaPath.type == path_type)
    paths = session_data.exec(statement).all()

    video_extensions = {".mp4", ".mkv", ".avi", ".ts", ".rmvb"}

    for mp in paths:
        logger.info(f"正在扫描路径: {mp.path} ({mp.type})")
        scan_dir = Path(mp.path)

        if not scan_dir.exists() or not scan_dir.is_dir():
            logger.warning(f"路径不存在或不是目录: {mp.path}")
            continue

        video_count = 0
        try:
            # 遍历一级子目录
            for sub_dir in scan_dir.iterdir():
                if sub_dir.is_dir():
                    # 以一级文件夹的名字作为电影或剧集的名字
                    extracted_title = sub_dir.name
                    logger.info(f"发现媒体目录: {extracted_title}")

                    # 递归扫描该子目录下的所有视频文件
                    for file_path in sub_dir.rglob("*"):
                        if file_path.is_file() and file_path.suffix.lower() in video_extensions:
                            str_path = str(file_path.absolute())
                            filename = file_path.name

                            # 解析文件名获取季和集信息（如果有）
                            parsed = parse_media_filename(filename)
                            has_sub = check_has_subtitle(file_path)

                            # 检查数据库是否已有记录
                            existing_file = session_data.exec(
                                select(ScannedFile).where(ScannedFile.file_path == str_path)
                            ).first()

                            if not existing_file:
                                new_file = ScannedFile(
                                    path_id=mp.id,
                                    type=mp.type,
                                    file_path=str_path,
                                    filename=filename,
                                    # 统一使用一级文件夹名作为标题
                                    extracted_title=extracted_title,
                                    year=parsed["year"],
                                    season=parsed["season"],
                                    episode=parsed["episode"],
                                    has_subtitle=has_sub,
                                )
                                session_data.add(new_file)
                            else:
                                existing_file.filename = filename
                                existing_file.extracted_title = extracted_title
                                existing_file.year = parsed["year"]
                                existing_file.season = parsed["season"]
                                existing_file.episode = parsed["episode"]
                                existing_file.has_subtitle = has_sub
                                session_data.add(existing_file)

                            video_count += 1
        except Exception as e:
            logger.error(f"扫描路径 {mp.path} 时发生错误: {e}")

        logger.info(f"路径 {mp.path} 扫描完成，共找到 {video_count} 个视频文件。")
        mp.last_scanned_at = datetime.now()
        session_data.add(mp)

    session_data.commit()


@router.post("/files/{file_id}/auto-match")
async def auto_match_single_file(
    file_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)
):
    """针对单个视频文件触发全自动搜索、下载与归档逻辑"""
    file_record = session.get(ScannedFile, file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # 启动真正的全自动匹配后台任务
    background_tasks.add_task(run_auto_match_process, file_id, session)

    return {"status": "ok", "message": f"Full auto-match process for '{file_record.filename}' started in background"}


@router.post("/tv/match-season")
async def match_tv_season(
    title: str,
    season: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    """触发特定剧集的特定季全自动补全字幕"""
    background_tasks.add_task(run_season_match_process, title, season)
    return {"status": "ok", "message": f"Matching process for '{title}' Season {season} started in background"}


@router.post("/match")
async def trigger_match(
    path_type: Optional[str] = Query(default=None, pattern="^(movie|tv)$"),
    background_tasks: BackgroundTasks = None,
    session: Session = Depends(get_session),
):
    """手动触发媒体库与字幕的自动化匹配"""
    background_tasks.add_task(run_media_scan_and_match, session, path_type)
    return {"status": "ok", "message": f"Media scan and match task ({path_type or 'all'}) started in background"}
