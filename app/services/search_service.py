import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select

from ..core.config import ConfigManager, SettingKey
from ..core.scraper import ZimukuAgent
from ..db.models import SearchCache

logger = logging.getLogger(__name__)


class SearchService:
    @staticmethod
    async def search(
        session: Session, q: str, season: Optional[int] = None, episode: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        # 构建缓存 key
        cache_key = q
        if season is not None and episode is not None:
            cache_key = f"{q}|S{season:02d}E{episode:02d}"

        # 1. 检查缓存
        statement = select(SearchCache).where(SearchCache.query == cache_key)
        cache = session.exec(statement).first()

        if cache and cache.expires_at > datetime.now():
            try:
                return json.loads(cache.results_json)
            except Exception as e:
                logger.error(f"解析缓存失败: {e}")

        # 2. 执行爬虫
        agent = ZimukuAgent()
        try:
            results = await agent.search(q, season=season, episode=episode)
            results_data = [r.to_dict() for r in results]

            # 3. 更新缓存
            expiry_hours = ConfigManager.get_int(SettingKey.CACHE_EXPIRY_HOURS, 24)
            if not cache:
                cache = SearchCache(query=cache_key)

            cache.results_json = json.dumps(results_data, ensure_ascii=False)
            cache.expires_at = datetime.now() + timedelta(hours=expiry_hours)

            session.add(cache)
            session.commit()
            return results_data
        finally:
            await agent.close()
