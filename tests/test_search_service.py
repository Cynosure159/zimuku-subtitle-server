import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from app.db.models import SearchCache
from app.services.search_service import SearchService

# Use in-memory database for testing
sqlite_url = "sqlite://"
test_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})


@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        yield session
    SQLModel.metadata.drop_all(test_engine)


@pytest.mark.anyio
async def test_search_returns_cached_results(session):
    """Test cache hit returns cached data"""
    # Create valid cache entry
    cache_entry = SearchCache(
        query="Avatar",
        results_json=json.dumps([{"title": "Avatar", "link": "http://example.com/1"}], ensure_ascii=False),
        expires_at=datetime.now() + timedelta(hours=1),
    )
    session.add(cache_entry)
    session.commit()

    # Mock ZimukuAgent
    with patch("app.services.search_service.ZimukuAgent") as MockAgent:
        mock_agent = AsyncMock()
        mock_agent.search = AsyncMock()  # Should NOT be called
        MockAgent.return_value = mock_agent

        results = await SearchService.search(session, "Avatar")

    # Should return cached results
    assert len(results) == 1
    assert results[0]["title"] == "Avatar"
    mock_agent.search.assert_not_called()


@pytest.mark.anyio
async def test_search_misses_cache_and_calls_agent(session):
    """Test cache miss calls scraper"""
    # No cache entry exists
    with patch("app.services.search_service.ZimukuAgent") as MockAgent:
        mock_agent = AsyncMock()
        mock_result = MagicMock()
        mock_result.to_dict.return_value = {"title": "Avatar", "link": "http://example.com/1"}
        mock_agent.search = AsyncMock(return_value=[mock_result])
        mock_agent.close = AsyncMock()
        MockAgent.return_value = mock_agent

        results = await SearchService.search(session, "Avatar")

    # Should call agent and return results
    mock_agent.search.assert_called_once_with("Avatar", season=None, episode=None)
    assert len(results) == 1
    assert results[0]["title"] == "Avatar"

    # Cache should be created
    cached = session.exec(select(SearchCache).where(SearchCache.query == "Avatar")).first()
    assert cached is not None


@pytest.mark.anyio
async def test_search_updates_expired_cache(session):
    """Test search updates expired cache"""
    # Create expired cache entry
    cache_entry = SearchCache(
        query="Avatar",
        results_json=json.dumps([{"title": "Old", "link": "http://old.com"}], ensure_ascii=False),
        expires_at=datetime.now() - timedelta(hours=1),  # Expired
    )
    session.add(cache_entry)
    session.commit()

    with patch("app.services.search_service.ZimukuAgent") as MockAgent:
        mock_agent = AsyncMock()
        mock_result = MagicMock()
        mock_result.to_dict.return_value = {"title": "New", "link": "http://new.com"}
        mock_agent.search = AsyncMock(return_value=[mock_result])
        mock_agent.close = AsyncMock()
        MockAgent.return_value = mock_agent

        results = await SearchService.search(session, "Avatar")

    # Should return new results (expired cache is ignored)
    assert results[0]["title"] == "New"

    # Cache should be updated with new data
    cached = session.exec(select(SearchCache).where(SearchCache.query == "Avatar")).first()
    cached_data = json.loads(cached.results_json)
    assert cached_data[0]["title"] == "New"


@pytest.mark.anyio
async def test_search_with_season_episode(session):
    """Test search with season and episode builds correct cache key"""
    with patch("app.services.search_service.ZimukuAgent") as MockAgent:
        mock_agent = AsyncMock()
        mock_result = MagicMock()
        mock_result.to_dict.return_value = {"title": "The Office S01E01", "link": "http://example.com/1"}
        mock_agent.search = AsyncMock(return_value=[mock_result])
        mock_agent.close = AsyncMock()
        MockAgent.return_value = mock_agent

        _results = await SearchService.search(session, "The Office", season=1, episode=1)

    # Should build correct cache key with S01E01
    mock_agent.search.assert_called_once_with("The Office", season=1, episode=1)

    cached = session.exec(select(SearchCache).where(SearchCache.query == "The Office|S01E01")).first()
    assert cached is not None
    assert "S01E01" in cached.query


@pytest.mark.anyio
async def test_search_expired_cache_calls_agent(session):
    """Test expired cache entry triggers new search"""
    # Create expired cache entry
    cache_entry = SearchCache(
        query="Avatar",
        results_json=json.dumps([{"title": "Old", "link": "http://old.com"}], ensure_ascii=False),
        expires_at=datetime.now() - timedelta(hours=1),  # Expired
    )
    session.add(cache_entry)
    session.commit()

    with patch("app.services.search_service.ZimukuAgent") as MockAgent:
        mock_agent = AsyncMock()
        mock_result = MagicMock()
        mock_result.to_dict.return_value = {"title": "New", "link": "http://new.com"}
        mock_agent.search = AsyncMock(return_value=[mock_result])
        mock_agent.close = AsyncMock()
        MockAgent.return_value = mock_agent

        results = await SearchService.search(session, "Avatar")

    # Should call agent for expired cache
    mock_agent.search.assert_called_once()
    assert results[0]["title"] == "New"
