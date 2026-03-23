from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlmodel import Session, delete

from app.db.models import MediaPath, ScannedFile, SubtitleTask
from app.db.session import create_db_and_tables, engine, session_scope
from app.services.auto_match_service import AutoMatchService, SeasonMatchService, SubtitleCandidateScorer


@pytest.fixture(autouse=True)
def clean_app_db():
    create_db_and_tables()
    with Session(engine) as session:
        session.exec(delete(ScannedFile))
        session.exec(delete(MediaPath))
        session.exec(delete(SubtitleTask))
        session.commit()


def test_subtitle_candidate_scorer_prefers_matching_episode_and_chs():
    wrong_episode = Path("Show.S01E01.ass")
    best_match = Path("Show.S01E02.chs.ass")

    wrong_score = SubtitleCandidateScorer.score(wrong_episode, season=1, episode=2)
    best_score = SubtitleCandidateScorer.score(best_match, season=1, episode=2)

    assert best_score > wrong_score


@pytest.mark.anyio
async def test_auto_match_retries_until_top_five_candidates(monkeypatch, tmp_path):
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

    search_results = [SimpleNamespace(link=f"http://example.com/{index}") for index in range(6)]
    requested_links = []

    async def fake_links(link: str):
        requested_links.append(link)
        return [f"{link}.zip"]

    async def fake_download(_links, link: str):
        if link.endswith("/4"):
            return "Show.S01E02.chs.ass", b"subtitle"
        return "invalid.bin", b"not a subtitle"

    agent = SimpleNamespace(
        search=AsyncMock(return_value=search_results),
        get_download_page_links=AsyncMock(side_effect=fake_links),
        download_file=AsyncMock(side_effect=fake_download),
        close=AsyncMock(return_value=None),
    )

    monkeypatch.setattr("app.services.auto_match_service.ZimukuAgent", lambda: agent)
    monkeypatch.setattr("app.services.auto_match_service.get_storage_path", lambda: str(tmp_path / "storage"))

    service = AutoMatchService(session_factory=session_scope)
    matched = await service.run_for_file(scanned_file.id)

    assert matched is True
    assert requested_links == [f"http://example.com/{index}" for index in range(5)]
    assert (video_path.parent / "Show.S01E02.ass").exists()


@pytest.mark.anyio
async def test_season_match_service_runs_sequentially_with_throttle():
    with Session(engine) as session:
        first_file = ScannedFile(
            path_id=1,
            type="tv",
            file_path="/library/Show.S01E01.mkv",
            filename="Show.S01E01.mkv",
            extracted_title="Show",
            season=1,
            episode=1,
            has_subtitle=False,
        )
        second_file = ScannedFile(
            path_id=1,
            type="tv",
            file_path="/library/Show.S01E02.mkv",
            filename="Show.S01E02.mkv",
            extracted_title="Show (2024)",
            season=1,
            episode=2,
            has_subtitle=False,
        )
        session.add_all([first_file, second_file])
        session.commit()
        session.refresh(first_file)
        session.refresh(second_file)

    calls = []

    async def fake_auto_match(file_id: int):
        calls.append(("match", file_id))
        return True

    async def fake_sleep(seconds: float):
        calls.append(("sleep", seconds))

    service = SeasonMatchService(
        session_factory=session_scope,
        auto_match_runner=fake_auto_match,
        sleep_func=fake_sleep,
    )

    await service.run_for_season("Show (2024)", 1)

    assert calls == [
        ("match", first_file.id),
        ("sleep", 2),
        ("match", second_file.id),
        ("sleep", 2),
    ]
