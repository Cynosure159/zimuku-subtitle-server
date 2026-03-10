import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..core.config import ConfigManager
from ..core.scraper import ZimukuAgent
from ..db.models import SearchCache
from ..db.session import get_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
async def search_subtitles(
    q: str,
    season: Optional[int] = Query(default=None, description="季数（可选，用于剧集精确匹配）"),
    episode: Optional[int] = Query(default=None, description="集数（可选，用于剧集精确匹配）"),
    session: Session = Depends(get_session),
):
    """搜索字幕，带缓存逻辑

    支持按季/集精确匹配（三层递进策略）：
    - 不传 season/episode：返回所有匹配 q 的字幕
    - 传 season + episode：按 S01E02 格式精确匹配指定集的字幕
    """
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")

    # 构建缓存 key：包含 season/episode 信息
    cache_key = q
    if season is not None and episode is not None:
        cache_key = f"{q}|S{season:02d}E{episode:02d}"

    # 1. 检查缓存
    statement = select(SearchCache).where(SearchCache.query == cache_key)
    cache = session.exec(statement).first()

    if cache and cache.expires_at > datetime.now():
        logger.info(f"使用缓存结果: {cache_key}")
        try:
            results_data = json.loads(cache.results_json)
            return results_data
        except Exception as e:
            logger.error(f"解析缓存 JSON 失败: {e}")

    # 2. 执行爬虫搜索
    agent = ZimukuAgent()
    try:
        results = await agent.search(q, season=season, episode=episode)
        results_data = [r.to_dict() for r in results]

        # 3. 更新缓存
        expiry_hours = int(ConfigManager.get("cache_expiry_hours", "24"))
        if not cache:
            cache = SearchCache(query=cache_key)

        cache.results_json = json.dumps(results_data, ensure_ascii=False)
        cache.expires_at = datetime.now() + timedelta(hours=expiry_hours)

        session.add(cache)
        session.commit()

        return results_data
    except Exception as e:
        logger.error(f"搜索出错: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    finally:
        await agent.close()
