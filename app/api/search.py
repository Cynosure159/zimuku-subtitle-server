import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from ..db.session import get_session
from ..services.search_service import SearchService
from .errors import raise_for_service_error

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/")
async def search_subtitles(
    q: str = Query(..., min_length=1, description="搜索关键字"),
    season: Optional[int] = Query(default=None, ge=1, description="季数（可选，用于剧集精确匹配）"),
    episode: Optional[int] = Query(default=None, ge=1, description="集数（可选，用于剧集精确匹配）"),
    session: Session = Depends(get_session),
):
    """搜索字幕，带缓存逻辑"""
    try:
        return await SearchService.search(session, q, season, episode)
    except Exception as exc:
        logger.error("搜索出错: %s", exc)
        raise_for_service_error(exc)
