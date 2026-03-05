import json
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ..core.config import ConfigManager
from ..core.scraper import ZimukuAgent
from ..db.models import SearchCache
from ..db.session import get_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
async def search_subtitles(q: str, session: Session = Depends(get_session)):
    """搜索字幕，带缓存逻辑"""
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")

    # 1. 检查缓存
    statement = select(SearchCache).where(SearchCache.query == q)
    cache = session.exec(statement).first()

    if cache and cache.expires_at > datetime.now():
        logger.info(f"使用缓存结果: {q}")
        try:
            results_data = json.loads(cache.results_json)
            return results_data
        except Exception as e:
            logger.error(f"解析缓存 JSON 失败: {e}")

    # 2. 执行爬虫
    agent = ZimukuAgent()
    try:
        results = await agent.search(q)
        results_data = [r.to_dict() for r in results]

        # 3. 更新缓存
        expiry_hours = int(ConfigManager.get("cache_expiry_hours", "24"))
        if not cache:
            cache = SearchCache(query=q)

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
