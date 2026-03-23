from pathlib import Path

import pytest
from sqlmodel import Session, delete, select

from app.db.models import MediaPath, ScannedFile
from app.db.session import create_db_and_tables, engine
from app.services.media_service import MediaService


@pytest.fixture(autouse=True)
def clean_app_db():
    create_db_and_tables()
    with Session(engine) as session:
        session.exec(delete(ScannedFile))
        session.exec(delete(MediaPath))
        session.commit()


@pytest.fixture(name="temp_media_dir")
def temp_media_dir_fixture(tmp_path: Path):
    movie_dir = tmp_path / "Interstellar (2014)"
    movie_dir.mkdir()
    (movie_dir / "interstellar.1080p.mkv").touch()

    tv_dir = tmp_path / "The Last of Us"
    tv_dir.mkdir()
    (tv_dir / "The.Last.of.Us.S01E01.mkv").touch()
    (tv_dir / "The.Last.of.Us.S01E02.mkv").touch()

    (tmp_path / "lone_video.mp4").touch()
    return tmp_path


@pytest.mark.anyio
async def test_run_media_scan_logic(temp_media_dir):
    with Session(engine) as session:
        mp = MediaPath(path=str(temp_media_dir), type="movie", enabled=True)
        session.add(mp)
        session.commit()

    await MediaService.run_media_scan_and_match()

    with Session(engine) as session:
        files = session.exec(select(ScannedFile)).all()

    assert len(files) == 3

    interstellar_files = [file_record for file_record in files if "interstellar" in file_record.filename.lower()]
    assert len(interstellar_files) == 1
    assert interstellar_files[0].extracted_title == "Interstellar (2014)"

    tlou_files = [file_record for file_record in files if "the.last.of.us" in file_record.filename.lower()]
    assert len(tlou_files) == 2
    for file_record in tlou_files:
        assert file_record.extracted_title == "The Last of Us"
        assert file_record.season == 1
        assert file_record.episode in [1, 2]


@pytest.mark.anyio
async def test_cleanup_non_existent_files(temp_media_dir):
    fake_path = temp_media_dir / "non_existent.mkv"

    with Session(engine) as session:
        session.add(
            ScannedFile(
                path_id=1,
                file_path=str(fake_path),
                filename="non_existent.mkv",
                extracted_title="Fake",
                type="movie",
            )
        )
        session.add(MediaPath(path=str(temp_media_dir), type="movie", enabled=True))
        session.commit()

    await MediaService.run_media_scan_and_match()

    with Session(engine) as session:
        existing_fake = session.exec(select(ScannedFile).where(ScannedFile.file_path == str(fake_path))).first()
        files = session.exec(select(ScannedFile)).all()

    assert existing_fake is None
    assert len(files) == 3


@pytest.mark.anyio
async def test_cleanup_orphan_records(temp_media_dir):
    with Session(engine) as session:
        session.add(
            ScannedFile(
                path_id=999,
                file_path="orphan.mkv",
                filename="orphan.mkv",
                extracted_title="Orphan",
                type="movie",
            )
        )
        session.add(MediaPath(path=str(temp_media_dir), type="movie", enabled=True))
        session.commit()

    await MediaService.run_media_scan_and_match()

    with Session(engine) as session:
        orphan = session.exec(select(ScannedFile).where(ScannedFile.path_id == 999)).first()

    assert orphan is None
