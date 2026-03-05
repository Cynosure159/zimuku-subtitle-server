from datetime import datetime, timedelta

import pytest
from sqlmodel import Session, select

from app.db.models import SearchCache, Setting, SubtitleTask
from app.db.session import create_db_and_tables, engine


@pytest.fixture(name="session")
def session_fixture():
    # 使用独立的测试数据库或直接在原库操作（此处为简单起见，且由于 sqlite 默认是本地文件，直接初始化即可）
    create_db_and_tables()
    with Session(engine) as session:
        yield session


def test_create_setting(session: Session):
    setting = Setting(key="test_key", value="test_value", description="test_desc")
    session.add(setting)
    session.commit()
    session.refresh(setting)

    assert setting.id is not None
    assert setting.key == "test_key"

    # Read
    db_setting = session.exec(select(Setting).where(Setting.key == "test_key")).first()
    assert db_setting.value == "test_value"


def test_update_setting(session: Session):
    # Ensure exists
    setting = session.exec(select(Setting).where(Setting.key == "test_key")).first()
    if not setting:
        setting = Setting(key="test_key", value="old_value")
        session.add(setting)
        session.commit()

    setting.value = "new_value"
    session.add(setting)
    session.commit()

    db_setting = session.exec(select(Setting).where(Setting.key == "test_key")).first()
    assert db_setting.value == "new_value"


def test_search_cache(session: Session):
    cache = SearchCache(
        query="avatar",
        results_json='[{"title": "Avatar 2"}]',
        expires_at=datetime.now() + timedelta(days=1),
    )
    session.add(cache)
    session.commit()

    db_cache = session.exec(select(SearchCache).where(SearchCache.query == "avatar")).first()
    assert db_cache is not None
    assert "Avatar 2" in db_cache.results_json


def test_subtitle_task(session: Session):
    task = SubtitleTask(title="Avengers", source_url="http://example.com")
    session.add(task)
    session.commit()

    db_task = session.exec(select(SubtitleTask).where(SubtitleTask.title == "Avengers")).first()
    assert db_task.status == "pending"
