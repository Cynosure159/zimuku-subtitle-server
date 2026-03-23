from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete, select

from app.api.media import trigger_match
from app.db.models import MediaPath, ScannedFile, SubtitleTask
from app.db.session import create_db_and_tables, engine
from app.main import app
from app.services.media_service import MediaService
from app.services.task_service import TaskService

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_app_db():
    create_db_and_tables()
    with Session(engine) as session:
        session.exec(delete(ScannedFile))
        session.exec(delete(MediaPath))
        session.exec(delete(SubtitleTask))
        session.commit()


class RecordingBackgroundTasks:
    def __init__(self):
        self.calls = []

    def add_task(self, func, *args, **kwargs):
        self.calls.append((func, args, kwargs))


def test_media_poster_rejects_absolute_paths(create_media_file):
    media_root = create_media_file("library/Movie/poster.jpg", "ok").parents[1]
    outside_file = create_media_file("outside/leak.jpg", "secret")

    with Session(engine) as session:
        session.add(MediaPath(path=str(media_root), type="movie", enabled=True))
        session.commit()

    response = client.get("/media/poster", params={"path": str(outside_file)})

    assert response.status_code == 404


@pytest.mark.anyio
async def test_trigger_match_does_not_capture_request_scoped_session():
    background_tasks = RecordingBackgroundTasks()

    with Session(engine) as session:
        await trigger_match(background_tasks=background_tasks, path_type=None, session=session)

    assert len(background_tasks.calls) == 1
    _, args, _ = background_tasks.calls[0]
    assert all(not isinstance(arg, Session) for arg in args)


@pytest.mark.anyio
async def test_media_scan_background_flow_uses_own_session(tmp_path):
    movie_dir = tmp_path / "Interstellar (2014)"
    movie_dir.mkdir(parents=True)
    (movie_dir / "interstellar.1080p.mkv").write_text("video", encoding="utf-8")

    with Session(engine) as session:
        session.add(MediaPath(path=str(tmp_path), type="movie", enabled=True))
        session.commit()

    await MediaService.run_media_scan_and_match("movie")

    with Session(engine) as session:
        scanned_files = session.exec(select(ScannedFile)).all()

    assert len(scanned_files) == 1
    assert scanned_files[0].filename == "interstellar.1080p.mkv"


@pytest.mark.anyio
async def test_tv_download_moves_subtitle_into_episode_directory(monkeypatch, subtitle_zip_bytes, tmp_path):
    season_dir = tmp_path / "The Last of Us" / "Season 01"
    season_dir.mkdir(parents=True)
    video_file = season_dir / "The.Last.of.Us.S01E02.mkv"
    video_file.write_text("video", encoding="utf-8")

    download_dir = tmp_path / "downloads"
    archive_bytes = subtitle_zip_bytes({"episode.srt": "subtitle"})

    agent = SimpleNamespace(
        get_download_page_links=AsyncMock(return_value=["http://example.com/sub.zip"]),
        download_file=AsyncMock(return_value=("tlou.zip", archive_bytes)),
        close=AsyncMock(return_value=None),
    )

    monkeypatch.setattr("app.services.download_workflow.ZimukuAgent", lambda: agent)
    monkeypatch.setattr("app.services.download_workflow.ConfigManager.get", lambda *args, **kwargs: str(download_dir))

    with Session(engine) as session:
        task = TaskService.create_task(
            session=session,
            title="The Last of Us",
            source_url="http://example.com/detail",
            target_path=str(season_dir),
            target_type="tv",
            season=1,
            episode=2,
            language="zh-CN",
        )
        task_id = task.id

    await TaskService.run_download_task(task_id)

    with Session(engine) as session:
        task = session.get(SubtitleTask, task_id)

    expected_path = season_dir / "The.Last.of.Us.S01E02.zh-CN.srt"
    assert task.status == "completed"
    assert task.error_msg is None
    assert task.save_path == str(expected_path)
    assert expected_path.exists()


@pytest.mark.anyio
async def test_download_partial_failure_is_not_marked_completed(monkeypatch, tmp_path):
    movie_dir = tmp_path / "Interstellar (2014)"
    movie_dir.mkdir(parents=True)
    video_file = movie_dir / "interstellar.1080p.mkv"
    video_file.write_text("video", encoding="utf-8")

    download_dir = tmp_path / "downloads"

    agent = SimpleNamespace(
        get_download_page_links=AsyncMock(return_value=["http://example.com/sub.srt"]),
        download_file=AsyncMock(return_value=("interstellar.srt", b"subtitle")),
        close=AsyncMock(return_value=None),
    )

    monkeypatch.setattr("app.services.download_workflow.ZimukuAgent", lambda: agent)
    monkeypatch.setattr("app.services.download_workflow.ConfigManager.get", lambda *args, **kwargs: str(download_dir))

    def raise_move_error(*args, **kwargs):
        raise OSError("disk full")

    monkeypatch.setattr("app.services.download_workflow.shutil.move", raise_move_error)

    with Session(engine) as session:
        task = TaskService.create_task(
            session=session,
            title="Interstellar",
            source_url="http://example.com/detail",
            target_path=str(video_file),
            target_type="movie",
            language="zh-CN",
        )
        task_id = task.id

    await TaskService.run_download_task(task_id)

    with Session(engine) as session:
        task = session.get(SubtitleTask, task_id)

    assert task.status in {"failed", "partial_failed"}
    assert task.error_msg


def test_media_poster_rejects_path_traversal(create_media_file):
    media_root = create_media_file("library/Movie/poster.jpg", "ok").parents[1]
    outside_file = create_media_file("outside/secret.jpg", "secret")

    with Session(engine) as session:
        session.add(MediaPath(path=str(media_root), type="movie", enabled=True))
        session.commit()

    traversal_path = f"../{outside_file.parent.name}/{outside_file.name}"
    response = client.get("/media/poster", params={"path": traversal_path})

    assert response.status_code == 404


@pytest.mark.anyio
async def test_auto_match_handles_direct_subtitle_download(monkeypatch, tmp_path):
    video_path = tmp_path / "Movie" / "Interstellar.2014.mkv"
    video_path.parent.mkdir(parents=True)
    video_path.write_text("video", encoding="utf-8")

    scanned_file = ScannedFile(
        path_id=1,
        type="movie",
        file_path=str(video_path),
        filename=video_path.name,
        extracted_title="Interstellar (2014)",
    )
    with Session(engine) as session:
        session.add(scanned_file)
        session.commit()
        session.refresh(scanned_file)

    agent = SimpleNamespace(
        search=AsyncMock(return_value=[SimpleNamespace(link="http://example.com/direct")]),
        get_download_page_links=AsyncMock(return_value=["http://example.com/direct.srt"]),
        download_file=AsyncMock(return_value=("interstellar.srt", b"subtitle")),
        close=AsyncMock(return_value=None),
    )

    monkeypatch.setattr("app.services.media_service.ZimukuAgent", lambda: agent)
    monkeypatch.setattr("app.services.media_service.get_storage_path", lambda: str(tmp_path / "storage"))

    await MediaService._run_auto_match_internal(scanned_file.id)

    with Session(engine) as session:
        refreshed = session.exec(select(ScannedFile).where(ScannedFile.id == scanned_file.id)).one()
    assert refreshed.has_subtitle is True
    assert (video_path.parent / "Interstellar.2014.srt").exists()


@pytest.mark.anyio
async def test_auto_match_prefers_best_subtitle_from_archive(monkeypatch, subtitle_zip_bytes, tmp_path):
    video_path = tmp_path / "Show" / "Show.S01E02.mkv"
    video_path.parent.mkdir(parents=True)
    video_path.write_text("video", encoding="utf-8")

    scanned_file = ScannedFile(
        path_id=1,
        type="tv",
        file_path=str(video_path),
        filename=video_path.name,
        extracted_title="Show",
        season=1,
        episode=2,
    )
    with Session(engine) as session:
        session.add(scanned_file)
        session.commit()
        session.refresh(scanned_file)

    archive_bytes = subtitle_zip_bytes(
        {
            "Show.S01E01.ass": "wrong episode",
            "Show.S01E02.chs.ass": "best match",
        }
    )

    agent = SimpleNamespace(
        search=AsyncMock(return_value=[SimpleNamespace(link="http://example.com/archive")]),
        get_download_page_links=AsyncMock(return_value=["http://example.com/archive.zip"]),
        download_file=AsyncMock(return_value=("show.zip", archive_bytes)),
        close=AsyncMock(return_value=None),
    )

    monkeypatch.setattr("app.services.media_service.ZimukuAgent", lambda: agent)
    monkeypatch.setattr("app.services.media_service.get_storage_path", lambda: str(tmp_path / "storage"))

    await MediaService._run_auto_match_internal(scanned_file.id)

    with Session(engine) as session:
        refreshed = session.exec(select(ScannedFile).where(ScannedFile.id == scanned_file.id)).one()
    final_subtitle = video_path.parent / "Show.S01E02.ass"

    assert refreshed.has_subtitle is True
    assert final_subtitle.exists()
    assert final_subtitle.read_text(encoding="utf-8") == "best match"
