import os
import shutil
import tempfile
from pathlib import Path

import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from app.db.models import MediaPath, ScannedFile
from app.services.media_service import MediaService


# 使用内存数据库进行测试
@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="temp_media_dir")
def temp_media_dir_fixture():
    # 创建临时媒体库目录
    temp_dir = tempfile.mkdtemp()

    # 模拟电影目录
    movie_dir = Path(temp_dir) / "Interstellar (2014)"
    movie_dir.mkdir()
    (movie_dir / "interstellar.1080p.mkv").touch()

    # 模拟剧集目录
    tv_dir = Path(temp_dir) / "The Last of Us"
    tv_dir.mkdir()
    (tv_dir / "The.Last.of.Us.S01E01.mkv").touch()
    (tv_dir / "The.Last.of.Us.S01E02.mkv").touch()

    # 模拟根目录下的杂乱文件 (应该被忽略或按新规则不计入一级文件夹标题)
    (Path(temp_dir) / "lone_video.mp4").touch()

    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.mark.asyncio
async def test_run_media_scan_logic(session, temp_media_dir):
    # 1. 添加扫描路径
    mp = MediaPath(path=temp_media_dir, type="movie", enabled=True)
    session.add(mp)
    session.commit()
    session.refresh(mp)

    # 2. 执行扫描
    await MediaService.run_media_scan_and_match(session)

    # 3. 验证结果
    files = session.exec(select(ScannedFile)).all()

    # 应该找到 3 个文件 (1个电影 + 2个剧集)
    # 根目录下的 lone_video.mp4 应该被忽略，因为扫描逻辑是遍历一级目录
    assert len(files) == 3

    # 验证电影标题
    interstellar_files = [f for f in files if "interstellar" in f.filename.lower()]
    assert len(interstellar_files) == 1
    assert interstellar_files[0].extracted_title == "Interstellar (2014)"

    # 验证剧集标题和归类
    tlou_files = [f for f in files if "the.last.of.us" in f.filename.lower()]
    assert len(tlou_files) == 2
    for f in tlou_files:
        assert f.extracted_title == "The Last of Us"
        assert f.season == 1
        assert f.episode in [1, 2]


@pytest.mark.asyncio
async def test_cleanup_non_existent_files(session, temp_media_dir):
    # 1. 预先注入一个不存在的文件记录
    fake_path = os.path.join(temp_media_dir, "non_existent.mkv")
    sf = ScannedFile(path_id=1, file_path=fake_path, filename="non_existent.mkv", extracted_title="Fake", type="movie")
    session.add(sf)

    # 注入一个存在的路径记录
    mp = MediaPath(path=temp_media_dir, type="movie", enabled=True)
    session.add(mp)
    session.commit()

    # 2. 执行扫描
    await MediaService.run_media_scan_and_match(session)

    # 3. 验证不存在的文件已被删除
    existing_fake = session.exec(select(ScannedFile).where(ScannedFile.file_path == fake_path)).first()
    assert existing_fake is None

    # 验证正常文件还在
    files = session.exec(select(ScannedFile)).all()
    assert len(files) == 3  # 1 movie + 2 tv episodes


@pytest.mark.asyncio
async def test_cleanup_orphan_records(session, temp_media_dir):
    # 模拟一个孤儿记录（path_id 不存在）
    sf = ScannedFile(path_id=999, file_path="orphan.mkv", filename="orphan.mkv", extracted_title="Orphan", type="movie")
    session.add(sf)

    # 添加一个有效的路径
    mp = MediaPath(path=temp_media_dir, type="movie", enabled=True)
    session.add(mp)
    session.commit()

    # 执行扫描
    await MediaService.run_media_scan_and_match(session)

    # 验证孤儿记录已被清理
    orphan = session.exec(select(ScannedFile).where(ScannedFile.path_id == 999)).first()
    assert orphan is None
