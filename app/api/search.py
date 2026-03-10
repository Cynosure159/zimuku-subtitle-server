import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from ..db.session import get_session
from ..services.search_service import SearchService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
async def search_subtitles(
    q: str,
    season: Optional[int] = Query(default=None, description="季数（可选，用于剧集精确匹配）"),
    episode: Optional[int] = Query(default=None, description="集数（可选，用于剧集精确匹配）"),
    session: Session = Depends(get_session),
):
    """搜索字幕，带缓存逻辑"""
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")

    try:
        return await SearchService.search(session, q, season, episode)
    except Exception as e:
        logger.error(f"搜索出错: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
