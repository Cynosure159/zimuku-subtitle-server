import os
import tempfile
from unittest.mock import patch

import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.db.models import SearchCache, SubtitleTask
from app.services.system_service import SystemService

# Use in-memory database for testing
sqlite_url = "sqlite://"
test_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture(autouse=True)
def isolated_log_file(tmp_path, monkeypatch):
    """Use a temp log file for each test to avoid polluting the repo root."""
    log_file = tmp_path / "app.log"
    monkeypatch.setenv("ZIMUKU_LOG_FILE", str(log_file))
    yield


def test_get_stats_empty_db(session):
    """Test getting stats with empty database"""
    stats = SystemService.get_stats(session)

    assert stats["tasks"]["total"] == 0
    assert stats["tasks"]["completed"] == 0
    assert stats["tasks"]["failed"] == 0
    assert stats["tasks"]["pending"] == 0
    assert stats["cache"]["total_entries"] == 0


def test_get_stats_with_tasks(session):
    """Test getting stats with tasks"""
    # Add completed task
    task1 = SubtitleTask(
        title="Task 1",
        source_url="http://example.com/1",
        status="completed",
    )
    session.add(task1)

    # Add failed task
    task2 = SubtitleTask(
        title="Task 2",
        source_url="http://example.com/2",
        status="failed",
    )
    session.add(task2)

    # Add pending task
    task3 = SubtitleTask(
        title="Task 3",
        source_url="http://example.com/3",
        status="pending",
    )
    session.add(task3)

    session.commit()

    stats = SystemService.get_stats(session)

    assert stats["tasks"]["total"] == 3
    assert stats["tasks"]["completed"] == 1
    assert stats["tasks"]["failed"] == 1
    assert stats["tasks"]["pending"] == 1


def test_get_stats_with_cache(session):
    """Test getting stats with cache entries"""
    from datetime import datetime, timedelta

    # Add cache entries
    cache1 = SearchCache(
        query="test1",
        results_json="[]",
        expires_at=datetime.now() + timedelta(hours=24),
    )
    cache2 = SearchCache(
        query="test2",
        results_json="[]",
        expires_at=datetime.now() + timedelta(hours=24),
    )
    session.add_all([cache1, cache2])
    session.commit()

    stats = SystemService.get_stats(session)

    assert stats["cache"]["total_entries"] == 2


def test_get_stats_storage_not_exists(session):
    """Test getting stats when storage path doesn't exist"""
    with patch("app.services.system_service.ConfigManager") as MockConfig:
        MockConfig.get.return_value = "/nonexistent/storage"

        stats = SystemService.get_stats(session)

        assert stats["storage"]["path"] == "/nonexistent/storage"
        assert stats["storage"]["total_size_mb"] == 0
        assert stats["storage"]["free_space_gb"] == 0


def test_get_stats_storage_with_files(session):
    """Test getting stats with storage files"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create some files in temp storage
        test_file = os.path.join(tmpdir, "test.txt")
        with open(test_file, "w") as f:
            f.write("x" * (1024 * 1024))  # 1 MB

        with patch("app.services.system_service.ConfigManager") as MockConfig:
            MockConfig.get.return_value = tmpdir

            stats = SystemService.get_stats(session)

            assert stats["storage"]["path"] == tmpdir
            assert stats["storage"]["total_size_mb"] > 0


def test_get_logs_file_not_found():
    """Test getting logs when file doesn't exist"""
    logs = SystemService.get_logs()

    assert len(logs) == 1
    assert "not found" in logs[0].lower()


def test_get_logs_with_content():
    """Test getting logs with content"""
    log_file = os.environ["ZIMUKU_LOG_FILE"]
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("Line 1\nLine 2\nLine 3\n")

    logs = SystemService.get_logs()

    assert len(logs) > 0
    assert "Line 1" in logs[0]


def test_get_logs_line_limit():
    """Test getting logs with line limit"""
    log_file = os.environ["ZIMUKU_LOG_FILE"]
    with open(log_file, "w", encoding="utf-8") as f:
        for i in range(20):
            f.write(f"Line {i}\n")

    logs = SystemService.get_logs(lines=5)

    assert len(logs) <= 5
