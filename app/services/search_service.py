import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select

from ..core.config import ConfigManager, SettingKey
from ..core.scraper import ZimukuAgent
from ..db.models import SearchCache
from .errors import ExternalServiceError

logger = logging.getLogger(__name__)


class SearchService:
    @staticmethod
    def _build_cache_key(q: str, season: Optional[int], episode: Optional[int]) -> str:
        if season is None or episode is None:
            return q
        return f"{q}|S{season:02d}E{episode:02d}"

    @staticmethod
    def _load_cached_results(cache: Optional[SearchCache]) -> Optional[List[Dict[str, Any]]]:
        if cache is None or cache.expires_at <= datetime.now():
            return None

        try:
            return json.loads(cache.results_json)
        except Exception as e:
            logger.error(f"解析缓存失败: {e}")
            return None

    @staticmethod
    async def search(
        session: Session, q: str, season: Optional[int] = None, episode: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        cache_key = SearchService._build_cache_key(q, season, episode)

        statement = select(SearchCache).where(SearchCache.query == cache_key)
        cache = session.exec(statement).first()
        cached_results = SearchService._load_cached_results(cache)
        if cached_results is not None:
            return cached_results

        agent = ZimukuAgent()
        try:
            try:
                results = await agent.search(q, season=season, episode=episode)
            except Exception as exc:
                raise ExternalServiceError("Search failed") from exc

            results_data = [r.to_dict() for r in results]

            expiry_hours = ConfigManager.get_int(SettingKey.CACHE_EXPIRY_HOURS, 24)
            expires_at = datetime.now() + timedelta(hours=expiry_hours)
            if cache is None:
                cache = SearchCache(query=cache_key, expires_at=expires_at)

            cache.results_json = json.dumps(results_data, ensure_ascii=False)
            cache.expires_at = expires_at
            session.add(cache)
            session.commit()
            return results_data
        finally:
            await agent.close()
