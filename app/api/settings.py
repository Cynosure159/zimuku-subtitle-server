from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingUpdate(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


@router.get("/")
async def list_settings():
    """获取所有配置"""
    return SettingsService.get_all_settings()


@router.post("/")
async def update_setting(update: SettingUpdate):
    """更新或创建配置"""
    try:
        setting = SettingsService.set_setting(update.key, update.value, update.description)
        return setting
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
