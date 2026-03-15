from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from ..db.models import Setting
from ..db.session import get_session
from ..services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingUpdate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


@router.get("/")
async def list_settings(session: Session = Depends(get_session)):
    """获取所有配置"""
    return session.exec(select(Setting)).all()


@router.post("/")
async def update_setting(update: SettingUpdate):
    """更新或创建配置"""
    try:
        setting = SettingsService.set_setting(update.key, update.value, update.description)
        return setting
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
